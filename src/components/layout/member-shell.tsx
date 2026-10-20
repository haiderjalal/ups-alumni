"use client";

import { Bell, Briefcase, BookOpen, Building2, CalendarDays, ClipboardList, CreditCard, FileText, Flag, Handshake, History, Home, Landmark, Layers, LayoutDashboard, LogOut, Menu, MessageSquare, Newspaper, RotateCcw, Settings, ShieldCheck, UserRound, Users, GraduationCap, Circle, ClipboardCheck, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { signOutAction } from "@/features/auth/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";

import { Wordmark } from "./wordmark";
import type { MemberNavItem } from "./member-navigation";

const ICONS: Record<string, LucideIcon> = {
  Bell, Briefcase, BookOpen, Building2, CalendarDays, ClipboardCheck, ClipboardList, CreditCard, FileText, Flag, GraduationCap,
  Handshake, History, Home, Landmark, Layers, LayoutDashboard, MessageSquare, Newspaper, RotateCcw, Settings, ShieldCheck, UserRound, Users,
};

interface MemberShellProps {
  items: readonly MemberNavItem[];
  userName: string;
  unreadNotifications: number;
  children: React.ReactNode;
}

function isActive(pathname: string, href: string): boolean {
  if (href === ROUTES.app) {
    return pathname === ROUTES.app;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({ items, pathname, onNavigate, unreadNotifications }: {
  items: readonly MemberNavItem[];
  pathname: string;
  onNavigate?: () => void;
  unreadNotifications: number;
}) {
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = ICONS[item.iconName] ?? Circle;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 hover:bg-brand-lilac",
                active && "bg-brand-deep text-white hover:bg-brand-deep",
              )}
            >
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.href === ROUTES.appNotifications && unreadNotifications > 0 ? (
                <span className="rounded-full bg-brand-lime px-2 py-0.5 text-xs font-semibold text-brand-night ring-1 ring-inset ring-brand-night/15">
                  <span className="sr-only">unread: </span>
                  {unreadNotifications}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function SignOutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      className="w-full justify-start"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await signOutAction();
          router.replace(ROUTES.home);
          router.refresh();
        })
      }
    >
      <LogOut aria-hidden="true" className="size-4" />
      {isPending ? "Signing out…" : "Sign out"}
    </Button>
  );
}

/** Member chrome: a sidebar on large screens and a drawer on small screens, with the same destinations. */
export function MemberShell({ items, userName, unreadNotifications, children }: MemberShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-brand-mist lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden border-r border-brand-border bg-brand-surface lg:flex lg:flex-col lg:gap-8 lg:p-6" aria-label="Member navigation">
        <Wordmark />
        <nav aria-label="Member">
          <NavList items={items} pathname={pathname} unreadNotifications={unreadNotifications} />
        </nav>
        <div className="mt-auto space-y-2 border-t border-brand-border pt-4">
          <p className="truncate px-3 text-sm text-brand-muted">Signed in as {userName}</p>
          <SignOutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="flex h-16 items-center justify-between gap-3 border-b border-brand-border bg-brand-surface px-4 sm:px-6 lg:px-8">
          <div className="lg:hidden">
            <Wordmark />
          </div>
          <p className="hidden text-sm text-brand-muted lg:block">{userName}</p>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={<Button variant="outline" size="icon" className="lg:hidden" aria-label="Open member menu" />}
            >
              <Menu aria-hidden="true" className="size-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(88vw,320px)] bg-brand-surface p-0">
              <SheetTitle className="sr-only">Member menu</SheetTitle>
              <div className="flex h-full flex-col gap-6 p-6">
                <Wordmark />
                <nav aria-label="Member mobile">
                  <NavList items={items} pathname={pathname} onNavigate={() => setOpen(false)} unreadNotifications={unreadNotifications} />
                </nav>
                <div className="mt-auto border-t border-brand-border pt-4">
                  <SignOutButton />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </header>
        <main id="main-content" className="flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
