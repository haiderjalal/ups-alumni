import type { Metadata } from "next";

import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { MemberStatusActions } from "@/features/admin/components/operations-forms";
import { db } from "@/lib/db";
import { requireStaffRole } from "@/lib/session";
import { formatDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Members", robots: { index: false, follow: false } };

/** Active and suspended memberships, for suspension and reinstatement. Pending applicants are handled in the queue. */
export default async function AdminMembersPage() {
  await requireStaffRole(["MEMBERSHIP_ADMIN"]);
  const rows = await db.membership.findMany({
    where: { status: { in: ["ACTIVE", "SUSPENDED"] } },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 100,
    select: {
      status: true,
      suspendedReason: true,
      updatedAt: true,
      user: { select: { id: true, name: true, email: true, profile: { select: { matricYear: true } } } },
    },
  });

  return (
    <section className="space-y-10">
      <Container className="max-w-none space-y-10 px-0">
        <SectionHeading
          as="h1"
          eyebrow="Membership"
          title="Members"
          description="Suspension ends the member's sessions immediately and is recorded in the audit log. Reinstatement is possible only when every membership requirement is met."
        />
        {rows.length === 0 ? (
          <EmptyState title="No active or suspended members" description="Members appear here once their membership is activated." />
        ) : (
          <ul className="space-y-5">
            {rows.map((row) => (
              <li key={row.user.id} className="space-y-4 rounded-2xl border border-brand-border bg-brand-surface p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-2xl font-semibold">{row.user.name}</p>
                    <p className="text-sm text-brand-muted">
                      {row.user.email} · batch {row.user.profile?.matricYear ?? "not set"} · updated {formatDateTime(row.updatedAt)}
                    </p>
                  </div>
                  <span className="rounded-full bg-brand-lavender px-3 py-1 text-sm font-semibold">{row.status.toLowerCase()}</span>
                </div>
                {row.suspendedReason ? <p className="text-sm text-brand-muted">Reason on record: {row.suspendedReason}</p> : null}
                <MemberStatusActions userId={row.user.id} status={row.status === "ACTIVE" ? "ACTIVE" : "SUSPENDED"} />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </section>
  );
}
