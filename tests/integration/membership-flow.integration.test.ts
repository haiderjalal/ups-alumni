import { randomBytes } from "node:crypto";

import { beforeAll, describe, expect, it } from "vitest";

import { recordAudit } from "@/features/audit/services/audit.service";
import { decideApplication } from "@/features/admin/services/application-admin.service";
import { reinstateMember, suspendMember } from "@/features/admin/services/admin-operations.service";
import { provisionAlumniRecords } from "@/features/membership/services/provision.service";
import { searchDirectory, getMemberProfileView } from "@/features/directory/services/directory.service";
import { createRegistrationOrder, getPaymentOverview } from "@/features/payments/services/order.service";
import { submitPaymentAttempt } from "@/features/payments/services/attempt.service";
import { approvePaymentAttempt, rejectPaymentAttempt } from "@/features/payments/services/finance-review.service";
import { decideRefund, markRefundProcessed, openAutomaticRefundRequest } from "@/features/payments/services/refund.service";
import { submitApplication } from "@/features/registration/services/onboarding.service";
import { db } from "@/lib/db";

/**
 * Integration tests for the money, membership and privacy rules, run against a real PostgreSQL database
 * (ups_alumni_test). Account numbers and receipts are fixtures created for these tests only.
 */

const TODAY = new Date().toISOString().slice(0, 10);
let receivingAccountId = "";

async function resetDatabase(): Promise<void> {
  const rows = await db.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT LIKE '\_prisma%'
  `;
  const tables = rows.map((row) => `"${row.tablename}"`).join(", ");
  await db.$executeRawUnsafe(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
}

async function createMember(label: string, options: { verified?: boolean; discoverable?: boolean } = {}): Promise<string> {
  const email = `${label}.${randomBytes(3).toString("hex")}@example.com`;
  const user = await db.user.create({
    data: { name: `Member ${label}`, email, emailVerified: options.verified ?? true },
    select: { id: true },
  });
  await provisionAlumniRecords(user.id);
  await db.alumniProfile.update({
    where: { userId: user.id },
    data: {
      matricYear: 2018,
      currentCity: "Lahore",
      currentCountry: "Pakistan",
      professionalStatuses: ["EMPLOYED"],
      jobTitle: "Engineer",
      organization: "Acme",
      directoryDiscoverable: options.discoverable ?? true,
    },
  });
  return user.id;
}

async function createStaffUser(label: string): Promise<string> {
  const user = await db.user.create({
    data: {
      name: `Staff ${label}`,
      email: `staff.${label}.${randomBytes(3).toString("hex")}@example.com`,
      emailVerified: true,
    },
    select: { id: true },
  });
  return user.id;
}

async function markActive(userId: string): Promise<void> {
  await db.membership.update({ where: { userId }, data: { status: "ACTIVE", activatedAt: new Date() } });
}

async function submitForReview(userId: string): Promise<void> {
  const result = await submitApplication({
    userId,
    attestations: { attendedUps: true, informationAccurate: true },
  });
  expect(result.ok).toBe(true);
}

async function applicationVersion(userId: string): Promise<number> {
  const application = await db.alumniApplication.findUniqueOrThrow({ where: { userId }, select: { version: true } });
  return application.version;
}

/** Creates the order and submits transfer evidence with a receipt, as the member's payment page does. */
async function payWithReceipt(userId: string, reference: string) {
  const order = await createRegistrationOrder({ userId, receivingAccountId });
  expect(order.ok).toBe(true);
  const orderId = order.ok ? order.data.orderId : "";
  const receipt = await db.mediaAsset.create({
    data: {
      ownerId: userId,
      kind: "RECEIPT",
      storageKey: `receipt/${randomBytes(18).toString("base64url")}`,
      mimeType: "image/png",
      sizeBytes: 1024,
      originalName: "receipt.png",
      sha256: "0".repeat(64),
    },
    select: { id: true },
  });
  const submitted = await submitPaymentAttempt({
    userId,
    values: {
      orderId,
      transactionReference: reference,
      amountRupees: "500",
      paidOn: TODAY,
      payerName: "Test payer",
      receiptMediaId: receipt.id,
    },
  });
  return { orderId, submitted };
}

async function latestAttemptId(orderId: string): Promise<string> {
  const attempt = await db.paymentAttempt.findFirstOrThrow({
    where: { orderId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  return attempt.id;
}

const FINANCE = ["FINANCE_REVIEWER"] as const;
const MEMBERSHIP = ["MEMBERSHIP_ADMIN"] as const;

// Reviewer ids are foreign keys in the database, so the tests use real staff accounts, as the server does.
let FINANCE_ID = "";
let MEMBERSHIP_ID = "";

beforeAll(async () => {
  await resetDatabase();
  FINANCE_ID = await createStaffUser("finance");
  MEMBERSHIP_ID = await createStaffUser("membership");
  const account = await db.receivingAccount.create({
    data: {
      method: "BANK_TRANSFER",
      label: "Test account",
      accountTitle: "Test fixture account",
      accountIdentifier: "TEST-0000-0000",
      isActive: true,
      sortOrder: 0,
    },
    select: { id: true },
  });
  receivingAccountId = account.id;
});

describe("receipts, approvals and activation", () => {
  it("does not activate membership when a receipt is uploaded", async () => {
    const userId = await createMember("receipt-only");
    await submitForReview(userId);
    const { orderId, submitted } = await payWithReceipt(userId, "RECEIPT-ONLY-001");

    expect(submitted.ok).toBe(true);
    const membership = await db.membership.findUniqueOrThrow({ where: { userId }, select: { status: true } });
    const order = await db.registrationOrder.findUniqueOrThrow({ where: { id: orderId }, select: { status: true } });
    expect(membership.status).toBe("PENDING");
    expect(order.status).toBe("AWAITING_REVIEW");
  });

  it("keeps membership pending when the fee is confirmed but the application is not approved", async () => {
    const userId = await createMember("fee-only");
    await submitForReview(userId);
    const { orderId } = await payWithReceipt(userId, "FEE-ONLY-002");
    const attemptId = await latestAttemptId(orderId);

    const approved = await approvePaymentAttempt({
      attemptId,
      actorId: FINANCE_ID,
      actorRoles: FINANCE,
      reconciliationReference: "STMT-0002",
    });
    expect(approved.ok).toBe(true);

    const membership = await db.membership.findUniqueOrThrow({ where: { userId }, select: { status: true } });
    expect(membership.status).toBe("PENDING");
  });

  it("activates membership only after the fee and the alumni approval are both confirmed", async () => {
    const userId = await createMember("full-path");
    await submitForReview(userId);
    const { orderId } = await payWithReceipt(userId, "FULL-PATH-003");
    const attemptId = await latestAttemptId(orderId);
    await approvePaymentAttempt({ attemptId, actorId: FINANCE_ID, actorRoles: FINANCE, reconciliationReference: "STMT-0003" });

    const decision = await decideApplication({
      userId,
      decision: "APPROVE",
      note: "Verified against the class roll.",
      expectedVersion: await applicationVersion(userId),
      actorId: MEMBERSHIP_ID,
      actorRoles: MEMBERSHIP,
    });
    expect(decision.ok).toBe(true);
    expect(decision.ok && decision.data.membershipActivated).toBe(true);

    const membership = await db.membership.findUniqueOrThrow({ where: { userId }, select: { status: true, activatedAt: true } });
    expect(membership.status).toBe("ACTIVE");
    expect(membership.activatedAt).not.toBeNull();
  });

  it("confirms a payment once when two reviewers approve at the same moment", async () => {
    const userId = await createMember("double-click");
    await submitForReview(userId);
    const { orderId } = await payWithReceipt(userId, "DOUBLE-004");
    const attemptId = await latestAttemptId(orderId);

    const [first, second] = await Promise.all([
      approvePaymentAttempt({ attemptId, actorId: FINANCE_ID, actorRoles: FINANCE, reconciliationReference: "STMT-0004" }),
      approvePaymentAttempt({ attemptId, actorId: FINANCE_ID, actorRoles: FINANCE, reconciliationReference: "STMT-0004" }),
    ]);

    expect(first.ok && second.ok).toBe(true);
    const receipts = [first, second].map((result) => (result.ok ? result.data.receiptNumber : ""));
    expect(receipts[0]).toBe(receipts[1]);
    const payments = await db.confirmedPayment.count({ where: { orderId } });
    expect(payments).toBe(1);
  });

  it("lets a rejected transfer be corrected and resubmitted without paying again", async () => {
    const userId = await createMember("correction");
    await submitForReview(userId);
    const first = await payWithReceipt(userId, "CORRECT-005");
    const attemptId = await latestAttemptId(first.orderId);

    const rejected = await rejectPaymentAttempt({
      attemptId,
      actorId: FINANCE_ID,
      actorRoles: FINANCE,
      reason: "The receipt does not show the reference. Please upload the full receipt.",
    });
    expect(rejected.ok).toBe(true);
    const afterReject = await db.registrationOrder.findUniqueOrThrow({ where: { id: first.orderId }, select: { status: true } });
    expect(afterReject.status).toBe("UNPAID");

    const receipt = await db.mediaAsset.create({
      data: {
        ownerId: userId,
        kind: "RECEIPT",
        storageKey: `receipt/${randomBytes(18).toString("base64url")}`,
        mimeType: "application/pdf",
        sizeBytes: 2048,
        originalName: "receipt.pdf",
        sha256: "1".repeat(64),
      },
      select: { id: true },
    });
    const resubmitted = await submitPaymentAttempt({
      userId,
      values: { orderId: first.orderId, transactionReference: "CORRECT-005", amountRupees: "500", paidOn: TODAY, payerName: "", receiptMediaId: receipt.id },
    });
    expect(resubmitted.ok).toBe(true);

    const orders = await db.registrationOrder.count({ where: { userId } });
    const attempts = await db.paymentAttempt.count({ where: { order: { userId } } });
    expect(orders).toBe(1);
    expect(attempts).toBe(2);
  });

  it("refuses a transfer reference that was already accepted for the same account", async () => {
    const payer = await createMember("dup-a");
    const other = await createMember("dup-b");
    await submitForReview(payer);
    await submitForReview(other);

    const accepted = await payWithReceipt(payer, "SHARED-REF-006");
    expect(accepted.submitted.ok).toBe(true);

    const duplicate = await payWithReceipt(other, "SHARED-REF-006");
    expect(duplicate.submitted.ok).toBe(false);
    expect(!duplicate.submitted.ok && duplicate.submitted.fieldErrors?.transactionReference).toBeTruthy();
  });
});

describe("refunds, suspension and privacy", () => {
  it("opens a refund when an application is rejected after the fee was confirmed, and closes the membership once processed", async () => {
    const userId = await createMember("rejected-after-pay");
    await submitForReview(userId);
    const { orderId } = await payWithReceipt(userId, "REJECT-PAID-007");
    await approvePaymentAttempt({
      attemptId: await latestAttemptId(orderId),
      actorId: FINANCE_ID,
      actorRoles: FINANCE,
      reconciliationReference: "STMT-0007",
    });

    const rejected = await decideApplication({
      userId,
      decision: "REJECT",
      note: "Batch could not be confirmed.",
      expectedVersion: await applicationVersion(userId),
      actorId: MEMBERSHIP_ID,
      actorRoles: MEMBERSHIP,
    });
    expect(rejected.ok).toBe(true);

    const refund = await db.refund.findFirstOrThrow({ where: { order: { userId } }, select: { id: true, status: true, source: true } });
    expect(refund.status).toBe("REQUESTED");
    expect(refund.source).toBe("AUTOMATIC_REJECTION");

    expect((await decideRefund({ refundId: refund.id, decision: "APPROVED", note: "Approved after review.", actorId: FINANCE_ID, actorRoles: FINANCE })).ok).toBe(true);
    expect((await markRefundProcessed({ refundId: refund.id, transactionEvidence: "TRANSFER-REF-7788", actorId: FINANCE_ID, actorRoles: FINANCE })).ok).toBe(true);

    const membership = await db.membership.findUniqueOrThrow({ where: { userId }, select: { status: true } });
    const order = await db.registrationOrder.findUniqueOrThrow({ where: { id: orderId }, select: { status: true } });
    expect(membership.status).toBe("CLOSED");
    expect(order.status).toBe("REFUNDED");
  });

  it("removes sessions at once when a member is suspended, and does not reinstate a member who lacks a requirement", async () => {
    const userId = await createMember("suspended");
    await markActive(userId);
    await db.session.create({
      data: { userId, token: randomBytes(16).toString("hex"), expiresAt: new Date(Date.now() + 86_400_000) },
    });

    const suspended = await suspendMember({ userId, reason: "Account review pending.", actorId: MEMBERSHIP_ID, actorRoles: MEMBERSHIP });
    expect(suspended.ok).toBe(true);
    expect(await db.session.count({ where: { userId } })).toBe(0);

    const membership = await db.membership.findUniqueOrThrow({ where: { userId }, select: { status: true } });
    expect(membership.status).toBe("SUSPENDED");

    // Reinstatement re-checks every requirement. This member has no approved application and no confirmed fee.
    const reinstated = await reinstateMember({ userId, actorId: MEMBERSHIP_ID, actorRoles: MEMBERSHIP });
    expect(reinstated.ok).toBe(false);
  });

  it("opens a refund request only for a confirmed order", async () => {
    const userId = await createMember("no-fee");
    await submitForReview(userId);
    const opened = await db.$transaction((tx) => openAutomaticRefundRequest(tx, { userId, reason: "test" }));
    expect(opened.refundId).toBeNull();
  });

  it("hides members who are not listed or who are blocked, and never reveals private contact details", async () => {
    const viewer = await createMember("viewer");
    const listed = await createMember("listed");
    const hidden = await createMember("hidden", { discoverable: false });
    const blocked = await createMember("blocked");
    await Promise.all([markActive(viewer), markActive(listed), markActive(hidden), markActive(blocked)]);
    await db.block.create({ data: { blockerId: viewer, blockedId: blocked } });

    const { cards } = await searchDirectory(viewer, {});
    const names = cards.map((card) => card.name);
    expect(names).toContain("Member listed");
    expect(names).not.toContain("Member hidden");
    expect(names).not.toContain("Member blocked");
    expect(names).not.toContain("Member viewer");

    const listedPublicId = (await db.alumniProfile.findUniqueOrThrow({ where: { userId: listed }, select: { publicId: true } })).publicId;
    const hiddenPublicId = (await db.alumniProfile.findUniqueOrThrow({ where: { userId: hidden }, select: { publicId: true } })).publicId;
    const view = await getMemberProfileView(viewer, listedPublicId, false);
    expect(view).not.toBeNull();
    expect(view?.email).toBeNull();
    expect(view?.phone).toBeNull();
    expect(await getMemberProfileView(viewer, hiddenPublicId, false)).toBeNull();
  });

  it("requires a verified email before an application can be submitted", async () => {
    const userId = await createMember("unverified", { verified: false });
    const result = await submitApplication({ userId, attestations: { attendedUps: true, informationAccurate: true } });
    expect(result.ok).toBe(false);
  });

  it("shows the payment page a setup message when no receiving account is active", async () => {
    const userId = await createMember("overview");
    await submitForReview(userId);
    await db.receivingAccount.updateMany({ data: { isActive: false } });
    try {
      const overview = await getPaymentOverview(userId);
      expect(overview.canCreateOrder).toBe(false);
      expect(overview.blockedReason).toBeTruthy();
    } finally {
      await db.receivingAccount.updateMany({ where: { id: receivingAccountId }, data: { isActive: true } });
    }
  });

  it("writes audit entries for decisions", async () => {
    const actorId = await createMember("auditor");
    await db.$transaction((tx) => recordAudit(tx, { action: "test.audit", entityType: "test", entityId: "1", actorId }));
    const entry = await db.auditLog.findFirst({ where: { action: "test.audit" }, select: { id: true } });
    expect(entry).not.toBeNull();
  });
});
