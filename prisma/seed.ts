/**
 * Development seed. Synthetic records only: every member uses an example.com address and is marked as demo data in
 * the audit log. The seed refuses to run in production, does not create receiving accounts (those must be entered by
 * finance with real details), and prints a generated password once for the demo accounts.
 *
 *   npm run db:seed
 */
import { randomBytes } from "node:crypto";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { createOrderReference } from "@/lib/ids";

const DEMO_DOMAIN = "example.com";
const DEMO_BATCHES = [2017, 2018, 2019, 2020] as const;

interface DemoMember {
  name: string;
  batchYear: (typeof DEMO_BATCHES)[number];
  city: string;
  country: string;
  status: "EMPLOYED" | "BUSINESS_OWNER" | "STUDENT" | "SELF_EMPLOYED_FREELANCER";
  jobTitle: string | null;
  organization: string | null;
  discoverable: boolean;
}

const DEMO_MEMBERS: DemoMember[] = [
  { name: "Demo Member One", batchYear: 2017, city: "Chakdara", country: "Pakistan", status: "EMPLOYED", jobTitle: "Engineer", organization: "Example Engineering", discoverable: true },
  { name: "Demo Member Two", batchYear: 2017, city: "Lahore", country: "Pakistan", status: "BUSINESS_OWNER", jobTitle: null, organization: null, discoverable: true },
  { name: "Demo Member Three", batchYear: 2018, city: "Dubai", country: "United Arab Emirates", status: "EMPLOYED", jobTitle: "Analyst", organization: "Sample Finance", discoverable: true },
  { name: "Demo Member Four", batchYear: 2018, city: "Peshawar", country: "Pakistan", status: "SELF_EMPLOYED_FREELANCER", jobTitle: null, organization: null, discoverable: false },
  { name: "Demo Member Five", batchYear: 2019, city: "Islamabad", country: "Pakistan", status: "STUDENT", jobTitle: null, organization: null, discoverable: true },
  { name: "Demo Member Six", batchYear: 2020, city: "London", country: "United Kingdom", status: "EMPLOYED", jobTitle: "Teacher", organization: "Sample School", discoverable: true },
];

async function ensureFeeSchedule(): Promise<string> {
  const existing = await db.feeSchedule.findFirst({ where: { code: "registration" }, select: { id: true } });
  if (existing) {
    return existing.id;
  }
  const created = await db.feeSchedule.create({
    data: {
      code: "registration",
      amountMinor: 50_000,
      currency: "PKR",
      effectiveFrom: new Date("2020-01-01T00:00:00.000Z"),
      note: "Launch fee from the project brief (one-time PKR 500).",
    },
    select: { id: true },
  });
  return created.id;
}

async function ensureBatches(): Promise<Map<number, string>> {
  const ids = new Map<number, string>();
  for (const year of DEMO_BATCHES) {
    const batch = await db.batch.upsert({
      where: { year },
      create: { year, label: "Demo batch", isListed: true },
      update: {},
      select: { id: true },
    });
    ids.set(year, batch.id);
  }
  return ids;
}

async function ensureMember(member: DemoMember, index: number, password: string, feeScheduleId: string, batchIds: Map<number, string>): Promise<void> {
  const email = `demo.member${String(index + 1).padStart(2, "0")}@${DEMO_DOMAIN}`;
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  const userId = existing?.id ?? (await auth.api.signUpEmail({ body: { name: member.name, email, password } })).user.id;

  await db.user.update({ where: { id: userId }, data: { emailVerified: true } });
  await db.alumniProfile.update({
    where: { userId },
    data: {
      matricYear: member.batchYear,
      batchId: batchIds.get(member.batchYear) ?? null,
      currentCity: member.city,
      currentCountry: member.country,
      professionalStatuses: [member.status],
      jobTitle: member.jobTitle,
      organization: member.organization,
      directoryDiscoverable: member.discoverable,
      availableToMentor: index % 3 === 0,
      interests: ["reunions", "mentoring"],
    },
  });
  await db.alumniApplication.update({
    where: { userId },
    data: { status: "APPROVED", currentStep: 5, attestedAt: new Date(), submittedAt: new Date(), decidedAt: new Date() },
  });

  const existingOrder = await db.registrationOrder.findFirst({ where: { userId }, select: { id: true } });
  if (!existingOrder) {
    await db.$transaction(async (tx) => {
      const order = await tx.registrationOrder.create({
        data: {
          reference: createOrderReference(),
          userId,
          feeScheduleId,
          amountMinor: 50_000,
          currency: "PKR",
          status: "CONFIRMED",
        },
        select: { id: true },
      });
      const attempt = await tx.paymentAttempt.create({
        data: {
          orderId: order.id,
          status: "CONFIRMED",
          method: "BANK_TRANSFER",
          transactionReference: `DEMO${order.id.slice(-8).toUpperCase()}`,
          normalizedReference: `DEMO${order.id.slice(-8).toUpperCase()}`,
          amountMinor: 50_000,
          currency: "PKR",
          paidOn: new Date(),
          submittedById: userId,
          reconciliationReference: "DEMO-STATEMENT",
        },
        select: { id: true },
      });
      await tx.confirmedPayment.create({
        data: {
          orderId: order.id,
          attemptId: attempt.id,
          receiptNumber: `DEMO-RCPT-${order.id.slice(-6).toUpperCase()}`,
          amountMinor: 50_000,
          currency: "PKR",
          method: "BANK_TRANSFER",
          transactionReference: `DEMO${order.id.slice(-8).toUpperCase()}`,
          reconciliationReference: "DEMO-STATEMENT",
          confirmedById: userId,
        },
      });
    });
  }

  await db.membership.update({
    where: { userId },
    data: { status: "ACTIVE", activatedAt: new Date() },
  });
  await db.auditLog.create({
    data: { action: "seed.demo_member", entityType: "user", entityId: userId, actorId: null, metadataJson: { demo: true } },
  });
}

async function main(): Promise<void> {
  const env = getEnv();
  if (env.NODE_ENV === "production") {
    throw new Error("The development seed never runs in production.");
  }

  const password = process.env.SEED_DEMO_PASSWORD && process.env.SEED_DEMO_PASSWORD.length >= 12
    ? process.env.SEED_DEMO_PASSWORD
    : randomBytes(12).toString("base64url");

  const feeScheduleId = await ensureFeeSchedule();
  const batchIds = await ensureBatches();
  for (const [index, member] of DEMO_MEMBERS.entries()) {
    await ensureMember(member, index, password, feeScheduleId, batchIds);
  }

  console.info(`Seeded ${DEMO_MEMBERS.length} demo members (demo.memberNN@${DEMO_DOMAIN}).`);
  if (!process.env.SEED_DEMO_PASSWORD) {
    console.info(`Generated demo password (shown once, development only): ${password}`);
  }
  console.info("No receiving accounts were created. Enter real account details in /admin/settings.");
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Seed failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
