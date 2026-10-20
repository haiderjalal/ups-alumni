"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";

import { Wordmark } from "./wordmark";

const PUBLIC_NAV = [
  { label: "About", href: ROUTES.about },
  { label: "Membership", href: ROUTES.membership },
  { label: "Events", href: ROUTES.events },
  { label: "Stories", href: ROUTES.stories },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === ROUTES.home) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Public navigation. Desktop shows links inline; small screens use a drawer with the same destinations. */
export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-brand-border/80 bg-brand-mist/95 backdrop-blur supports-[backdrop-filter]:bg-brand-mist/85">
      <div className="mx-auto flex h-20 w-full max-w-[1240px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Wordmark />

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {PUBLIC_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium text-brand-ink transition-colors duration-200 hover:bg-brand-lilac",
                isActive(pathname, item.href) &&
                  "text-brand-deep underline decoration-brand-vermilion decoration-2 underline-offset-8",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Button variant="ghost" render={<Link href={ROUTES.login} />}>
            Sign in
          </Button>
          <Button render={<Link href={ROUTES.register} />}>Join the Network</Button>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={<Button variant="outline" size="icon" className="lg:hidden" aria-label="Open navigation menu" />}
          >
            <Menu aria-hidden="true" className="size-5" />
          </SheetTrigger>
          <SheetContent side="right" className="w-[min(88vw,360px)] bg-brand-mist p-0">
            <SheetTitle className="sr-only">Site navigation</SheetTitle>
            <div className="flex h-full flex-col gap-8 p-6">
              <Wordmark />
              <nav aria-label="Mobile primary" className="flex flex-col gap-1">
                {PUBLIC_NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive(pathname, item.href) ? "page" : undefined}
                    className="rounded-md px-3 py-3 font-display text-2xl font-semibold text-brand-ink hover:bg-brand-lilac"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-auto flex flex-col gap-3">
                <Button variant="outline" size="lg" render={<Link href={ROUTES.login} onClick={() => setOpen(false)} />}>
                  Sign in
                </Button>
                <Button size="lg" render={<Link href={ROUTES.register} onClick={() => setOpen(false)} />}>
                  Join the Network
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
