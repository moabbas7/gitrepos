/**
 * OG image templates (1200×630) rendered at BUILD time by scripts/emit-static.tsx with next/og.
 * Never rendered in the Worker. Three colours only: canvas black, white (with opacity), gradient.
 */
import type { ReactElement } from "react";

export const OG_SIZE = { width: 1200, height: 630 } as const;
/** Bump when a template changes so cached images are regenerated. */
export const OG_TEMPLATE_VERSION = 4;

const BLACK = "#07070B";
const WHITE = "#FAFAFA";
const GRAD = "linear-gradient(90deg, #049DFF 0%, #612BFB 50%, #FD26FE 100%)";
const w = (a: number) => `rgba(250,250,250,${a})`;

function Frame({ logo, children, footer }: { logo: string; children: ReactElement | ReactElement[]; footer: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: BLACK,
        color: WHITE,
        fontFamily: "Geist",
        position: "relative",
        padding: "64px 72px",
      }}
    >
      {/* soft gradient glows (the accent as light): full-canvas layers so nothing is clipped */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 1200,
          height: 630,
          display: "flex",
          backgroundImage: "radial-gradient(circle at 88% 8%, rgba(97,43,251,0.42) 0%, rgba(4,157,255,0.12) 26%, rgba(7,7,11,0) 48%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 1200,
          height: 630,
          display: "flex",
          backgroundImage: "radial-gradient(circle at 4% 104%, rgba(253,38,254,0.2) 0%, rgba(7,7,11,0) 36%)",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} width={48} height={48} alt="" style={{ borderRadius: 12 }} />
        <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em" }}>GitRepos</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>{children}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: "JetBrains Mono", fontSize: 22, color: w(0.5), letterSpacing: "0.04em" }}>{footer}</div>
        <div style={{ width: 220, height: 4, borderRadius: 4, backgroundImage: GRAD, display: "flex" }} />
      </div>
    </div>
  );
}

export interface RepoOgProps {
  owner: string;
  name: string;
  description: string | null;
  language: string | null;
  stars: string; // pre-formatted (compact) so the cache key only changes when the image does
  gained: string | null; // "+1.2k this week"
  placement: string | null; // "#3 trending today"
}

export function RepoOg({ logo, p }: { logo: string; p: RepoOgProps }) {
  const long = p.owner.length + p.name.length > 30;
  return (
    <Frame logo={logo} footer="gitrepos · trending on GitHub">
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        {p.placement && (
          <div style={{ display: "flex" }}>
            <div
              style={{
                display: "flex",
                padding: "8px 18px",
                borderRadius: 9999,
                fontFamily: "JetBrains Mono",
                fontSize: 22,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                backgroundImage: `linear-gradient(rgba(7,7,11,.3), rgba(7,7,11,.3)), ${GRAD}`,
              }}
            >
              {p.placement}
            </div>
          </div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", fontFamily: "JetBrains Mono", fontSize: long ? 56 : 72, lineHeight: 1.1 }}>
          <span style={{ color: w(0.5) }}>{p.owner}/</span>
          <span>{p.name}</span>
        </div>
        {p.description && (
          <div style={{ fontSize: 30, lineHeight: 1.4, color: w(0.64), maxWidth: 1000, display: "flex" }}>
            {p.description.length > 140 ? `${p.description.slice(0, 139)}…` : p.description}
          </div>
        )}
        <div style={{ display: "flex", gap: 28, fontFamily: "JetBrains Mono", fontSize: 28, color: w(0.64), marginTop: 8 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="26" height="26" viewBox="0 0 24 24">
              <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z" fill="rgba(250,250,250,0.64)" />
            </svg>
            {p.stars}
          </span>
          {p.gained && (
            <span style={{ display: "flex", alignItems: "center", gap: 10, color: WHITE }}>
              <svg width="22" height="22" viewBox="0 0 10 10">
                <defs>
                  <linearGradient id="up" x1="0" x2="1" y1="1" y2="0">
                    <stop offset="0" stopColor="#049DFF" />
                    <stop offset="0.5" stopColor="#612BFB" />
                    <stop offset="1" stopColor="#FD26FE" />
                  </linearGradient>
                </defs>
                <path d="M5 0.8 L9.6 9.2 L0.4 9.2 Z" fill="url(#up)" />
              </svg>
              {p.gained}
            </span>
          )}
          {p.language && <span>{p.language}</span>}
        </div>
      </div>
    </Frame>
  );
}

export interface PageOgProps {
  eyebrow: string;
  title: string;
  lead: string | null;
}

export function PageOg({ logo, p }: { logo: string; p: PageOgProps }) {
  return (
    <Frame logo={logo} footer="updated hourly · trend data CC0">
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontFamily: "JetBrains Mono", fontSize: 24, letterSpacing: "0.08em", textTransform: "uppercase", color: w(0.5) }}>
          {p.eyebrow}
        </div>
        <div style={{ fontSize: p.title.length > 34 ? 64 : 80, fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 1.04, display: "flex" }}>
          {p.title}
        </div>
        {p.lead && <div style={{ fontSize: 30, lineHeight: 1.4, color: w(0.64), maxWidth: 980, display: "flex" }}>{p.lead}</div>}
      </div>
    </Frame>
  );
}
