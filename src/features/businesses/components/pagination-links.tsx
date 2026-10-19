import Link from "next/link";

import { Button } from "@/components/ui/button";

interface PaginationLinksProps {
  basePath: string;
  query: Record<string, string>;
  page: number;
  pageCount: number;
}

/** Previous and next links that keep the active filters in the URL. */
export function PaginationLinks({
  basePath,
  query,
  page,
  pageCount,
}: PaginationLinksProps) {
  if (pageCount <= 1) {
    return null;
  }

  const hrefFor = (target: number): string => {
    const params = new URLSearchParams({ ...query, page: String(target) });
    return `${basePath}?${params.toString()}`;
  };

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-4"
    >
      {page > 1 ? (
        <Button variant="outline" render={<Link href={hrefFor(page - 1)} />}>
          Previous
        </Button>
      ) : (
        <span />
      )}
      <p className="text-sm text-brand-muted">
        Page {page} of {pageCount}
      </p>
      {page < pageCount ? (
        <Button variant="outline" render={<Link href={hrefFor(page + 1)} />}>
          Next
        </Button>
      ) : (
        <span />
      )}
    </nav>
  );
}
