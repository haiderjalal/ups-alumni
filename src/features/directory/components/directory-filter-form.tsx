import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PROFESSIONAL_STATUS_VALUES } from "@/features/registration/validation/registration.schema";

import type { DirectoryFilters } from "../services/directory.service";

const STATUS_LABELS: Record<(typeof PROFESSIONAL_STATUS_VALUES)[number], string> = {
  EMPLOYED: "Employed",
  BUSINESS_OWNER: "Business owner",
  SELF_EMPLOYED_FREELANCER: "Self-employed or freelancer",
  STUDENT: "Student",
  SEEKING_OPPORTUNITIES: "Seeking opportunities",
  RETIRED: "Retired",
  OTHER: "Other",
};

/**
 * Plain GET form, so every filter lives in the URL. Results are shareable with other members and work without
 * client-side state, which keeps the directory usable on slow connections.
 */
export function DirectoryFilterForm({ action, filters }: { action: string; filters: DirectoryFilters }) {
  return (
    <form method="get" action={action} className="grid gap-4 rounded-2xl border border-brand-border bg-brand-surface p-5 md:grid-cols-2 xl:grid-cols-4">
      <div className="space-y-2 md:col-span-2">
        <label htmlFor="q" className="text-sm font-semibold">
          Search by name, role or organization
        </label>
        <Input id="q" name="q" defaultValue={filters.q ?? ""} maxLength={80} />
      </div>
      <div className="space-y-2">
        <label htmlFor="batch" className="text-sm font-semibold">
          Matric year
        </label>
        <Input id="batch" name="batch" inputMode="numeric" defaultValue={filters.batchYear ?? ""} maxLength={4} />
      </div>
      <div className="space-y-2">
        <label htmlFor="city" className="text-sm font-semibold">
          City
        </label>
        <Input id="city" name="city" defaultValue={filters.city ?? ""} maxLength={80} />
      </div>
      <div className="space-y-2">
        <label htmlFor="industry" className="text-sm font-semibold">
          Industry
        </label>
        <Input id="industry" name="industry" defaultValue={filters.industry ?? ""} maxLength={80} />
      </div>
      <div className="space-y-2">
        <label htmlFor="status" className="text-sm font-semibold">
          Current status
        </label>
        <select id="status" name="status" defaultValue={filters.status ?? ""} className="h-11 w-full rounded-lg border border-brand-field bg-brand-surface px-3">
          <option value="">Any status</option>
          {PROFESSIONAL_STATUS_VALUES.map((value) => (
            <option key={value} value={value}>
              {STATUS_LABELS[value]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <label htmlFor="skill" className="text-sm font-semibold">
          Skill
        </label>
        <Input id="skill" name="skill" defaultValue={filters.skill ?? ""} maxLength={60} />
      </div>
      <div className="space-y-2">
        <label htmlFor="sort" className="text-sm font-semibold">
          Sort by
        </label>
        <select id="sort" name="sort" defaultValue={filters.sort ?? "name"} className="h-11 w-full rounded-lg border border-brand-field bg-brand-surface px-3">
          <option value="name">Name</option>
          <option value="batch_desc">Newest batch first</option>
          <option value="batch_asc">Oldest batch first</option>
        </select>
      </div>
      <fieldset className="flex flex-wrap gap-6 md:col-span-2">
        <legend className="sr-only">Quick filters</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="mentors" value="1" defaultChecked={filters.mentorsOnly} className="size-4 accent-brand-deep" />
          Available to mentor
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="hiring" value="1" defaultChecked={filters.hiringOnly} className="size-4 accent-brand-deep" />
          Hiring
        </label>
      </fieldset>
      <div className="flex flex-wrap gap-3 md:col-span-2">
        <Button type="submit">Apply filters</Button>
        <Button variant="ghost" render={<a href={action} />}>
          Clear filters
        </Button>
      </div>
    </form>
  );
}
