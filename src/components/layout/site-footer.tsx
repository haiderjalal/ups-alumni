import Link from "next/link";

import { ROUTES } from "@/constants/routes";
import { SITE } from "@/constants/site";

import { Wordmark } from "./wordmark";

const FOOTER_LINKS = [
  { label: "About", href: ROUTES.about },
  { label: "Membership", href: ROUTES.membership },
  { label: "Events", href: ROUTES.events },
  { label: "Stories", href: ROUTES.stories },
  { label: "FAQ", href: ROUTES.faq },
  { label: "Contact", href: ROUTES.contact },
] as const;

const POLICY_LINKS = [
  { label: "Privacy", href: ROUTES.privacy },
  { label: "Terms", href: ROUTES.terms },
  { label: "Refund policy", href: ROUTES.refundPolicy },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-brand-night text-white">
      <div className="mx-auto grid w-full max-w-[1240px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div className="space-y-5">
          <Wordmark inverted />
          <p className="max-w-sm text-sm leading-relaxed text-white/80">
            An alumni-led community for former {SITE.schoolName} students. {SITE.verificationLabel}.
          </p>
          <p className="inline-flex rounded-full border border-white/25 px-3 py-1 text-xs uppercase tracking-[0.14em] text-white/85">
            {SITE.governanceLabel}
          </p>
        </div>

        <nav aria-label="Footer" className="space-y-3">
          <p className="text-sm font-semibold text-white">Explore</p>
          <ul className="space-y-2 text-sm">
            {FOOTER_LINKS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-white/80 transition-colors duration-200 hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Policies" className="space-y-3">
          <p className="text-sm font-semibold text-white">Policies</p>
          <ul className="space-y-2 text-sm">
            {POLICY_LINKS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-white/80 transition-colors duration-200 hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="pt-4 text-xs leading-relaxed text-white/65">
            Institutional endorsement is shown only when the school confirms it. This site is not an official
            university website.
          </p>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto w-full max-w-[1240px] px-4 py-6 text-xs text-white/60 sm:px-6 lg:px-8">
          © {new Date().getFullYear()} {SITE.name}. {SITE.contextLine}.
        </p>
      </div>
    </footer>
  );
}
