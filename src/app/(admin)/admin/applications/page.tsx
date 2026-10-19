import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { PROFESSIONAL_STATUS_VALUES } from "@/features/registration/validation/registration.schema";
import { listApplicationsForReview, type ApplicationFilters } from "@/features/admin/services/application-admin.service";
import { ROUTES } from "@/constants/routes";
import { requireStaffRole } from "@/lib/session";
import { formatDate } from "@/lib/time";

export const metadata: Metadata = { title: "Applications", robots: { index: false, follow: false } };

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const STATUS_FILTERS = ["SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED", "APPROVED", "REJECTED"] as const;

export default async function ApplicationsPage({ searchParams }: PageProps) {
  await requireStaffRole(["MEMBERSHIP_ADMIN"]);
  const params = await searchParams;
  const status = first(params.status);
  const batch = Number(first(params.batch));
  const occupation = first(params.occupation);
  const filters: ApplicationFilters = {
    status: (STATUS_FILTERS as readonly string[]).includes(status ?? "") ? (status as ApplicationFilters["status"]) : undefined,
    batchYear: Number.isInteger(batch) && batch > 1900 ? batch : undefined,
    city: first(params.city)?.slice(0, 80),
    occupation: (PROFESSIONAL_STATUS_VALUES as readonly string[]).includes(occupation ?? "") ? (occupation as ApplicationFilters["occupation"]) : undefined,
  };
  const rows = await listApplicationsForReview(filters, 100);

  return (
    <section className="space-y-8">
      <Container className="max-w-none space-y-8 px-0">
        <SectionHeading
          as="h1"
          eyebrow="Membership"
          title="Alumni applications"
          description="Oldest submissions first. Filter by status, batch, city or occupation. Decisions are recorded with a version check."
        />
        <form method="get" className="grid gap-4 rounded-2xl border border-brand-border bg-brand-surface p-5 sm:grid-cols-2 xl:grid-cols-5">
          <label className="space-y-2 text-sm font-semibold">
            Status
            <select name="status" defaultValue={filters.status ?? ""} className="h-11 w-full rounded-lg border border-brand-border bg-brand-surface px-3 font-normal">
              <option value="">Open queue</option>
              {STATUS_FILTERS.map((value) => (
                <option key={value} value={value}>
                  {value.replace("_", " ").toLowerCase()}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm font-semibold">
            Batch year
            <input name="batch" defaultValue={filters.batchYear ?? ""} inputMode="numeric" className="h-11 w-full rounded-lg border border-brand-border px-3 font-normal" />
          </label>
          <label className="space-y-2 text-sm font-semibold">
            City
            <input name="city" defaultValue={filters.city ?? ""} className="h-11 w-full rounded-lg border border-brand-border px-3 font-normal" />
          </label>
          <label className="space-y-2 text-sm font-semibold">
            Occupation
            <select name="occupation" defaultValue={filters.occupation ?? ""} className="h-11 w-full rounded-lg border border-brand-border bg-brand-surface px-3 font-normal">
              <option value="">Any</option>
              {PROFESSIONAL_STATUS_VALUES.map((value) => (
                <option key={value} value={value}>
                  {value.replace(/_/g, " ").toLowerCase()}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-3">
            <Button type="submit">Apply</Button>
            <Button variant="ghost" render={<Link href={`${ROUTES.admin}/applications`} />}>
              Reset
            </Button>
          </div>
        </form>

        {rows.length === 0 ? (
          <EmptyState title="No applications match" description="Try another status or filter. New submissions appear here as applicants finish registration." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-brand-border bg-brand-surface">
            <table className="w-full min-w-[640px] text-left text-sm">
              <caption className="sr-only">Applications waiting for review</caption>
              <thead className="border-b border-brand-border text-brand-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Applicant</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Batch</th>
                  <th scope="col" className="px-4 py-3 font-semibold">City</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Submitted</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-semibold">{row.user.name}</td>
                    <td className="px-4 py-3">
                      {row.user.profile?.matricYear ?? "Not set"}
                      {row.user.profile?.batchReviewRequested ? <span className="ml-2 rounded-full bg-brand-tint px-2 py-0.5 text-xs">Manual review</span> : null}
                    </td>
                    <td className="px-4 py-3">{row.user.profile?.currentCity ?? "Not set"}</td>
                    <td className="px-4 py-3">{row.status.replace(/_/g, " ").toLowerCase()}</td>
                    <td className="px-4 py-3">{row.submittedAt ? formatDate(row.submittedAt) : "Not submitted"}</td>
                    <td className="px-4 py-3 text-right">
                      <Link className="font-semibold text-brand-deep underline underline-offset-4" href={`${ROUTES.admin}/applications/${row.user.id}`}>
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Container>
    </section>
  );
}
