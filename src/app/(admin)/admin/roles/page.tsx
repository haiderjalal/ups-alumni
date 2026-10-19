import type { Metadata } from "next";

import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { RevokeRoleButton, RoleGrantForm } from "@/features/admin/components/operations-forms";
import { listBatchesForAdmin } from "@/features/admin/services/admin-operations.service";
import { db } from "@/lib/db";
import { requireStaffRole } from "@/lib/session";
import { formatDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Staff roles", robots: { index: false, follow: false } };

/** Super administrators only. Role changes are audited, and nobody can change their own roles. */
export default async function RolesPage() {
  await requireStaffRole(["SUPER_ADMIN"]);
  const [assignments, batches] = await Promise.all([
    db.roleAssignment.findMany({
      where: { revokedAt: null },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: { select: { name: true, email: true, id: true } },
        batch: { select: { year: true } },
        group: { select: { name: true } },
      },
    }),
    listBatchesForAdmin(),
  ]);

  return (
    <section className="space-y-12">
      <Container className="max-w-none space-y-12 px-0">
        <SectionHeading
          as="h1"
          eyebrow="Governance"
          title="Staff roles"
          description="Grant the narrowest role that does the job. Representatives see only their batch or group. Finance and membership roles are never combined by default."
        />
        <RoleGrantForm batches={batches.map((batch) => ({ id: batch.id, year: batch.year }))} />
        <section aria-labelledby="active-roles" className="space-y-4">
          <h2 id="active-roles" className="font-display text-3xl font-semibold">Active assignments</h2>
          <ul className="divide-y divide-brand-border rounded-2xl border border-brand-border bg-brand-surface">
            {assignments.map((assignment) => (
              <li key={assignment.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                <div>
                  <p className="font-semibold">{assignment.user.name} · {assignment.role.replace(/_/g, " ").toLowerCase()}</p>
                  <p className="text-sm text-brand-muted">
                    {assignment.user.email}
                    {assignment.batch ? ` · batch ${assignment.batch.year}` : ""}
                    {assignment.group ? ` · ${assignment.group.name}` : ""} · granted {formatDateTime(assignment.createdAt)}
                  </p>
                </div>
                <RevokeRoleButton assignmentId={assignment.id} />
              </li>
            ))}
          </ul>
        </section>
      </Container>
    </section>
  );
}
