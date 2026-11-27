import type { ReactNode } from "react";
import { Breadcrumbs } from "./breadcrumbs";
import { Container } from "./container";
import { Aurora } from "./hero-fx";

/** Landing-page header: breadcrumbs, mono eyebrow, Geist H1, white/64 lead, soft aurora. */
export function PageHero({
  eyebrow,
  title,
  lead,
  crumbs,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  crumbs?: { name: string; path: string }[];
  children?: ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden">
      <Aurora className="-inset-x-[30vw] -top-40 bottom-0 opacity-60" />
      <Container className="space-y-5 pt-10 pb-8 sm:pt-14 sm:pb-10">
        {crumbs && crumbs.length > 1 && <Breadcrumbs items={crumbs} />}
        <div className="max-w-2xl space-y-3">
          <p className="gr-eyebrow">{eyebrow}</p>
          <h1 className="text-[34px] leading-[1.06] tracking-[-0.04em] sm:text-[48px]">{title}</h1>
          {lead && <p className="text-[16px] leading-relaxed text-fg/64 sm:text-[18px]">{lead}</p>}
        </div>
        {children}
      </Container>
    </section>
  );
}
