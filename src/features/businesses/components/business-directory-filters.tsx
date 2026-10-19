import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

interface BusinessDirectoryFiltersProps {
  sectors: string[];
  cities: string[];
  selectedSector: string | null;
  selectedCity: string | null;
}

const SELECT_CLASS =
  "h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm";

/** Plain GET form, so filtering works without JavaScript and the URL can be shared. */
export function BusinessDirectoryFilters({
  sectors,
  cities,
  selectedSector,
  selectedCity,
}: BusinessDirectoryFiltersProps) {
  const hasFilters = Boolean(selectedSector || selectedCity);

  return (
    <form
      method="get"
      action={ROUTES.appBusinesses}
      className="grid gap-4 rounded-2xl border border-brand-border bg-brand-surface p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
    >
      <div className="min-w-0 space-y-2">
        <label
          htmlFor="sector"
          className="text-sm font-semibold text-brand-ink"
        >
          Sector
        </label>
        <select
          id="sector"
          name="sector"
          defaultValue={selectedSector ?? ""}
          className={SELECT_CLASS}
        >
          <option value="">All sectors</option>
          {sectors.map((sector) => (
            <option key={sector} value={sector}>
              {sector}
            </option>
          ))}
        </select>
      </div>

      <div className="min-w-0 space-y-2">
        <label htmlFor="city" className="text-sm font-semibold text-brand-ink">
          City
        </label>
        <select
          id="city"
          name="city"
          defaultValue={selectedCity ?? ""}
          className={SELECT_CLASS}
        >
          <option value="">All cities</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit">Apply filters</Button>
        {hasFilters ? (
          <Link
            href={ROUTES.appBusinesses}
            className="text-sm font-semibold text-brand-deep underline underline-offset-4"
          >
            Clear
          </Link>
        ) : null}
      </div>
    </form>
  );
}
