"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
// Footer version stamp reads the real version so it can never drift.
import packageJson from "../../package.json";

// The masthead shows major.minor only ("1.19"); the footer carries the full version with its patch number.
const displayVersion = packageJson.version.split(".").slice(0, 2).join(".");

const STORYBOOK_URL = "/storybook/";
const storyUrl = (id: string) => `${STORYBOOK_URL}?path=/docs/${id}`;

// Locked logo geometry (v1.0): always render from the provided SVGs — never
// rebuild the feather/wordmark relationship in code.
const QUILL_MARK_PATH =
  "M34.2316 6.45123L38.0722 6.93131C38.0722 6.93131 39.526 4.25133 40.9527 2.98399C42.3339 1.75709 45.06 0.636927 45.06 0.636927C45.06 0.636927 38.3389 -1.28292 29.8041 1.54375C23.4092 3.66173 20.8427 10.1319 20.8427 10.1319C20.8427 10.1319 21.3885 8.14176 21.9095 6.93178C22.4329 5.7161 23.5098 3.94415 23.5098 3.94415C23.5098 3.94415 21.056 4.21693 17.162 7.46474C13.7142 10.3404 10.921 17.1197 10.921 17.1197C10.921 17.1197 11.3578 15.0909 11.7211 13.8129C12.0868 12.5265 12.788 10.5586 12.788 10.5586C12.788 10.5586 10.0675 13.3862 9.00067 16.9063C8.13749 19.7544 7.7738 24.4276 7.7738 24.4276C7.59673 23.4584 7.32518 22.9457 7.13369 21.9743C6.8983 20.7801 6.97902 20.0772 6.76029 18.88C6.76029 18.88 5.12076 22.5861 5.26671 25.0677C5.42674 27.7886 7.93382 31.2025 7.93382 31.2025C7.93382 31.2025 12.2611 22.0211 16.1485 17.1197C21.056 10.9321 25.4834 8.74495 25.4834 8.74495C25.4834 8.74495 17.5354 14.4527 11.7211 25.9212C6.42144 36.3746 5 49.9252 5 49.9252L8.25388 44.8043C8.25388 44.8043 7.56043 44.0576 7.56043 41.9238C7.56043 38.0105 10.6009 32.3756 10.6009 32.3756C10.6009 32.3756 14.9298 30.0864 17.162 27.9482C19.1028 26.089 21.3761 22.5073 21.3761 22.5073L16.842 24.4276C16.842 24.4276 19.6691 23.0941 24.95 16.9064C27.9007 13.449 33.6448 9.59843 33.6448 9.59843C33.6448 9.59843 31.6373 9.70348 30.3909 9.97191C28.7194 10.3319 26.3369 11.4655 26.3369 11.4655C26.3369 11.4655 28.5877 10.0687 30.3909 9.38515C32.6964 8.51122 36.8987 7.83813 36.8987 7.83813L34.2316 6.45123Z";

// Material Symbols Outlined glyphs at weight 500, verbatim from
// @material-symbols/svg-500 (viewBox 0 -960 960 960). The design system's Icon
// set is weight 400; the theme selector uses this slightly heavier cut so the
// tiny glyphs keep their stroke presence at 14-18px.
const SUN_500_PATH =
  "M573.26-386.89q38.61-38.51 38.61-93.14 0-54.62-38.64-93.23-38.63-38.61-93.26-38.61-54.62 0-93.11 38.64-38.49 38.63-38.49 93.26 0 54.62 38.52 93.11 38.51 38.49 93.14 38.49 54.62 0 93.23-38.52ZM338.5-338.5Q280-397 280-480t58.5-141.5Q397-680 480-680t141.5 58.5Q680-563 680-480t-58.5 141.5Q563-280 480-280t-141.5-58.5ZM204.07-445.93H35.93v-68.14h168.14v68.14Zm720 0H755.93v-68.14h168.14v68.14Zm-478.14-310v-168.14h68.14v168.14h-68.14Zm0 720v-168.14h68.14v168.14h-68.14ZM261.76-652.02l-105.5-102.74 48.5-49.98 102.22 105.26-45.22 47.46Zm494.48 495.76-104.22-105.5L699-308.74l104.74 103.26-47.5 49.22ZM651.26-699l103.5-104.74 49.98 47.5-104.26 104.22L651.26-699Zm-495 494.24 104.5-104.22L308.74-261 205.48-156.26l-49.22-48.5ZM480-480Z";
const MOON_500_PATH =
  "M479.96-117.37q-151.24 0-256.92-105.67-105.67-105.68-105.67-256.92t105.69-257.07Q328.74-842.87 480-842.87q7.52 0 16.04.38 8.53.38 22.29 1.38-33.85 32.96-52.66 78.88-18.8 45.93-18.8 96.49 0 91.3 63.98 155.2 63.97 63.91 155.37 63.91 50.32 0 96.37-17.19 46.04-17.18 78.76-48.27.76 11.76 1.14 18.71.38 6.96.38 13.12 0 151.22-105.84 257.05Q631.2-117.37 479.96-117.37Zm.04-68.13q104.22 0 182.35-63.91 78.13-63.92 98.37-149.89-23.09 10.28-50.08 15.3-27 5.02-53.51 4.54-113.97-3.11-194.15-82.8-80.18-79.7-83.52-195.11-.24-21.93 4.16-47.59 4.4-25.67 16.68-58.76-92.73 27.48-153.77 107.11Q185.5-576.98 185.5-480q0 122.89 85.81 208.69Q357.11-185.5 480-185.5Zm-6.39-289.11Z";

// radio_button_unchecked (ring) and circle-fill (disk) — the Classic pair's glyphs.
const RING_500_PATH =
  "M480.03-74.02q-83.46 0-157.54-31.88-74.07-31.88-129.39-87.2-55.32-55.32-87.2-129.36-31.88-74.04-31.88-157.51 0-84.46 31.88-158.54 31.88-74.07 87.16-128.9 55.28-54.84 129.34-86.82 74.06-31.99 157.55-31.99 84.48 0 158.59 31.97 74.1 31.97 128.91 86.77 54.82 54.8 86.79 128.88 31.98 74.08 31.98 158.6 0 83.5-31.99 157.57-31.98 74.07-86.82 129.36-54.83 55.29-128.87 87.17-74.04 31.88-158.51 31.88Zm-.03-68.13q141.04 0 239.45-98.75 98.4-98.76 98.4-239.1 0-141.04-98.4-239.45-98.41-98.4-239.57-98.4-140.16 0-238.95 98.4-98.78 98.41-98.78 239.57 0 140.16 98.75 238.95 98.76 98.78 239.1 98.78Z";
const DISK_500_PATH =
  "M480.03-74.02q-83.46 0-157.54-31.88-74.07-31.88-129.39-87.2-55.32-55.32-87.2-129.36-31.88-74.04-31.88-157.51 0-84.46 31.88-158.54 31.88-74.07 87.16-128.9 55.28-54.84 129.34-86.82 74.06-31.99 157.55-31.99 84.48 0 158.59 31.97 74.1 31.97 128.91 86.77 54.82 54.8 86.79 128.88 31.98 74.08 31.98 158.6 0 83.5-31.99 157.57-31.98 74.07-86.82 129.36-54.83 55.29-128.87 87.17-74.04 31.88-158.51 31.88Z";

// star_shine — Material's sparkle (older releases called it auto_awesome).
// Weight 500 to match the four above; @material-symbols/svg-500 is not a
// dependency, so this was taken from the published package, same as they were.
const SPARK_500_PATH =
  "M855.59-225.52 745.52-335.59l47.98-47.98L903.57-273.5l-47.98 47.98ZM709.91-702.17l-47.98-47.98L772-860.22l47.98 47.74-110.07 110.31Zm-459.58 0L140.02-812.48 188-860.22l110.07 110.07-47.74 47.98ZM104.65-225.52 56.67-273.5l110.07-110.07 47.98 47.98-110.07 110.07Zm227.44-30.96L480-345.22l148.15 89.74-39.61-167.72 130.59-113.78-171.96-15.04L480-710.7l-66.93 157.68-171.96 15.28L371.7-424.2l-39.61 167.72ZM229.17-114.02l66.44-285.31L74.02-591.67l292.31-25.24L480-886.22l113.91 269.31 292.31 25.24-221.59 192.34 66.2 285.31L480-265.65 229.17-114.02ZM480-483.09Z";

const CARET_500_PATH = "M480-338.26 234.26-584 283-632.74l197 197 197-197L725.74-584 480-338.26Z";

const THEME_OPTIONS = [
  { value: "light", label: "Dawn", path: SUN_500_PATH },
  { value: "dark", label: "Dusk", path: MOON_500_PATH },
  { value: "classic-light", label: "Classic Light", path: RING_500_PATH },
  { value: "classic-dark", label: "Classic Dark", path: DISK_500_PATH },
  { value: "intelligent", label: "Intelligent", path: SPARK_500_PATH },
] as const;
type ThemeValue = (typeof THEME_OPTIONS)[number]["value"];
const isTheme = (v: unknown): v is ThemeValue => THEME_OPTIONS.some((t) => t.value === v);

// Accent: which pigment carries eyebrows, accent words, links, and focus
// rings. Swatches use the pigment vars so they re-cut with the theme.
const ACCENT_OPTIONS = [
  { value: "moss", label: "Moss", swatchVar: "var(--moss)" },
  { value: "terracotta", label: "Terracotta", swatchVar: "var(--terracotta)" },
  { value: "indigo", label: "Indigo", swatchVar: "var(--indigo)" },
  { value: "gold", label: "Gold", swatchVar: "var(--gold)" },
] as const;
type AccentValue = (typeof ACCENT_OPTIONS)[number]["value"];
const isAccent = (v: unknown): v is AccentValue => ACCENT_OPTIONS.some((a) => a.value === v);

function ToggleGlyph({ path, className }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 -960 960 960" width={18} height={18} fill="currentColor" aria-hidden className={`inline-block shrink-0 ${className ?? ""}`}>
      <path d={path} />
    </svg>
  );
}

function QuillMark({ className, size }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 50 50"
      fill="none"
      width={size}
      height={size}
      className={className}
      aria-hidden={size ? true : undefined}
      aria-label={size ? undefined : "The Quill mark"}
    >
      <path fill="var(--ink)" d={QUILL_MARK_PATH} />
    </svg>
  );
}

function Logo() {
  return (
    <span className="inline-flex items-center whitespace-nowrap">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/home/quill-logo-light.svg" alt="Quill" width={74} height={38} className="dark:hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/home/quill-logo-dark.svg" alt="Quill" width={74} height={38} className="hidden dark:inline-block" />
    </span>
  );
}

function Eyebrow({ children, dash = false }: { children: React.ReactNode; dash?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 font-sans text-xs font-medium tracking-eyebrow uppercase text-[var(--accent-pigment)] whitespace-nowrap max-sm:text-[0.65rem] max-sm:tracking-[0.08em]">
      {dash && <span className="h-px w-5 bg-[var(--accent-pigment)] max-sm:hidden" />}
      {children}
    </span>
  );
}

function SectionHeader({
  eyebrow,
  title,
  caption,
}: {
  eyebrow: string;
  title: React.ReactNode;
  caption: string;
}) {
  return (
    <div className="mb-14 flex items-baseline justify-between gap-8 max-sm:mb-9">
      <div className="flex flex-col gap-4">
        <span className="font-sans text-xs font-medium tracking-eyebrow uppercase text-ink-muted">{eyebrow}</span>
        <h2 className="m-0 font-display text-3xl font-normal leading-heading tracking-display text-foreground [font-variation-settings:var(--fraunces-display)] max-sm:text-2xl">
          {title}
        </h2>
      </div>
      <p className="m-0 hidden text-right font-display text-base italic text-muted-foreground [font-variation-settings:var(--fraunces-caption)] md:block">
        {caption}
      </p>
    </div>
  );
}

function Accent({ children }: { children: React.ReactNode }) {
  return <em className="italic text-[var(--accent-pigment)] [font-variation-settings:var(--fraunces-accent)]">{children}</em>;
}

function SpecimenLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`text-2xs font-medium tracking-[0.2em] uppercase text-muted-foreground ${className ?? ""}`}>
      {children}
    </span>
  );
}

function Swatch({ color, pill = false, bordered = false }: { color: string; pill?: boolean; bordered?: boolean }) {
  return (
    <span
      className={`h-[30px] w-[30px] ${pill ? "rounded-full" : "rounded-sm"} ${bordered ? "border border-[var(--line-soft)]" : ""}`}
      style={{ background: color }}
    />
  );
}

export default function Home() {
  const [theme, setTheme] = useState<ThemeValue>("light");
  const [accent, setAccent] = useState<AccentValue>("moss");
  const [specimenOn, setSpecimenOn] = useState(true);

  useEffect(() => {
    // Always open at the very top — even after a reload or an anchor deep
    // link. The router applies its own hash scroll and canonical URL right
    // after hydration, so reset again on the next frame and shortly after,
    // instantly (the smooth-scroll CSS must not animate this).
    const resetScroll = () => {
      if (window.location.hash) {
        history.replaceState(null, "", window.location.pathname);
      }
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    resetScroll();
    const raf = requestAnimationFrame(resetScroll);
    const timer = setTimeout(resetScroll, 80);

    let stored: string | null = null;
    try {
      stored = localStorage.getItem("quill-home-theme");
    } catch {}
    if (isTheme(stored)) {
      document.documentElement.setAttribute("data-theme", stored);
      // Theme must be read post-hydration: the prerendered markup is always
      // "light", so reading localStorage during render would mismatch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTheme(stored);
    }

    let storedAccent: string | null = null;
    try {
      storedAccent = localStorage.getItem("quill-home-accent");
    } catch {}
    if (isAccent(storedAccent)) {
      document.documentElement.setAttribute("data-accent", storedAccent);
      setAccent(storedAccent);
    }

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, []);

  function selectTheme(next: ThemeValue) {
    document.documentElement.setAttribute("data-theme", next);
    setTheme(next);
    try {
      localStorage.setItem("quill-home-theme", next);
    } catch {}
  }

  function selectAccent(next: AccentValue) {
    document.documentElement.setAttribute("data-accent", next);
    setAccent(next);
    try {
      localStorage.setItem("quill-home-accent", next);
    } catch {}
  }

  const navLink =
    "text-sm font-medium text-ink-soft no-underline transition-colors duration-200 hover:text-[var(--accent-pigment)]";

  return (
    <div className="min-h-screen w-full bg-background font-sans text-ink-soft">
      <div className="paper-grain" />
      <div className="paper-specks" />

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-10 border-b border-[var(--line-faint)] bg-background">
        {/* Three zones: logo left, links centered, theme toggle right. On mobile
            the middle zone sits between the other two (true centering and the
            sun/moon pair don't fit a 390px row). */}
        <div className="mx-auto flex h-[72px] max-w-[1400px] items-center justify-between gap-4 px-3 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:gap-8 sm:px-12">
          <a href="#top" className="flex items-center gap-3 no-underline sm:justify-self-start">
            <Logo />
            {/* On mobile only the feather + Quill wordmark stays. */}
            <span className="inline-block h-[18px] w-px bg-[var(--line)] max-sm:hidden" />
            <span className="text-2xs font-medium tracking-[0.2em] uppercase text-muted-foreground max-sm:hidden">
              Design system
            </span>
          </a>
          <div className="flex items-center gap-7 max-sm:gap-2 sm:justify-self-center">
            <a href="#foundations" className={`${navLink} max-sm:text-[0.7rem]`}>Foundations</a>
            <a href="#components" className={`${navLink} max-sm:text-[0.7rem]`}>Components</a>
            <a href="#principles" className={`${navLink} max-sm:text-[0.7rem]`}>Principles</a>
          </div>
          {/* Four themes need a menu, not a switch. The trigger shows the active
              theme's glyph (label hides on mobile where the row is tight). */}
          <div className="flex items-center sm:justify-self-end">
            <DropdownMenu>
              <DropdownMenuTrigger
                className="flex items-center gap-1.5 rounded-lg border border-[var(--line-soft)] bg-transparent px-2.5 py-1.5 text-sm font-medium text-[var(--ink)] transition-colors duration-200 hover:bg-card"
                aria-label={`Theme: ${THEME_OPTIONS.find((t) => t.value === theme)?.label}`}
              >
                <ToggleGlyph
                  path={THEME_OPTIONS.find((t) => t.value === theme)?.path ?? SUN_500_PATH}
                  className="size-4 max-sm:size-3.5"
                />
                <span className="max-sm:hidden">
                  {THEME_OPTIONS.find((t) => t.value === theme)?.label}
                </span>
                <ToggleGlyph path={CARET_500_PATH} className="size-3 text-[var(--ink-soft)]" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {/* Base UI: GroupLabel must live INSIDE a Group/RadioGroup. */}
                <DropdownMenuRadioGroup
                  value={theme}
                  onValueChange={(next) => {
                    if (isTheme(next)) selectTheme(next);
                  }}
                >
                  <DropdownMenuLabel>Theme</DropdownMenuLabel>
                  {THEME_OPTIONS.map((t) => (
                    <DropdownMenuRadioItem key={t.value} value={t.value}>
                      <ToggleGlyph path={t.path} className="size-4" />
                      {t.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={accent}
                  onValueChange={(next) => {
                    if (isAccent(next)) selectAccent(next);
                  }}
                >
                  <DropdownMenuLabel>Accent</DropdownMenuLabel>
                  {ACCENT_OPTIONS.map((a) => (
                    <DropdownMenuRadioItem key={a.value} value={a.value}>
                      <span
                        aria-hidden
                        className="size-3.5 shrink-0 rounded-full border border-[var(--line-soft)]"
                        style={{ background: a.swatchVar }}
                      />
                      {a.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <header id="top" className="relative overflow-hidden bg-background">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.07] saturate-0 dark:invert [[data-theme=dark]_&]:opacity-[0.035]"
          style={{ backgroundImage: "url('/home/declaration.webp')" }}
        />
        <div className="relative mx-auto grid max-w-[1400px] grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] items-center gap-16 px-12 pt-12 pb-[104px] lg:pt-[68px] max-lg:grid-cols-1 max-sm:px-6 max-sm:pt-[15px] max-sm:pb-16">
          <div className="flex flex-col items-start gap-7 max-sm:gap-5">
            <Eyebrow dash>The Quill design system · Version {displayVersion}</Eyebrow>
            <h1 className="m-0 font-display text-5xl font-normal leading-display tracking-display text-foreground [font-variation-settings:var(--fraunces-display)] [text-wrap:balance]">
              A design system, made for <Accent>people</Accent>.
            </h1>
            <p className="m-0 max-w-[540px] text-lg leading-reading text-ink-soft">
              Warm neutral grounds, ink-toned type, and a narrow accent palette. Quill is designed for making interfaces
              feel approachable, delightful, and premium — crafted for everyday use.
            </p>
            <div className="mt-2 flex items-center gap-4">
              <Button size="lg" render={<a href={STORYBOOK_URL} />}>
                Open the Storybook <span aria-hidden>→</span>
              </Button>
              <Button size="lg" variant="outline" render={<a href="#foundations" />}>
                Read the foundations
              </Button>
            </div>
            <p className="m-0 mt-1 font-display text-sm italic text-muted-foreground [font-variation-settings:var(--fraunces-caption)]">
              Optimized for agentic development.
            </p>
          </div>
          <figure className="m-0 flex flex-col items-center gap-5 max-lg:hidden">
            <QuillMark className="h-auto w-full max-w-[360px] drop-shadow-[0_20px_28px_rgba(42,38,34,0.16)]" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/home/quill-stroke.svg" alt="" aria-hidden width={300} height={107} className="-mt-[108px] ml-0.5 dark:hidden" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/home/quill-stroke-cream.svg" alt="" aria-hidden width={300} height={107} className="-mt-[108px] ml-0.5 hidden dark:block" />
          </figure>
        </div>
      </header>

      {/* ── Foundations ─────────────────────────────────────────────────── */}
      <section id="foundations" className="border-y border-[var(--line-faint)] bg-paper-warm">
        <div className="mx-auto max-w-[1400px] px-12 py-24 max-sm:px-6 max-sm:py-12">
          <SectionHeader
            eyebrow="Foundations"
            title={<>Paper, ink, and four <Accent>pigments</Accent>.</>}
            caption="Everything sits on digital paper."
          />
          <div className="grid grid-cols-4 gap-6 max-lg:grid-cols-2 max-sm:grid-cols-1">
            <Card className="bg-paper">
              <CardContent className="flex h-full flex-col gap-[18px]">
                <SpecimenLabel>Color</SpecimenLabel>
                {/* Vars, not hexes, so the specimen re-renders with the active theme
                    (same convention as the accent dropdown swatches). */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex gap-2">
                    <Swatch color="var(--paper)" bordered />
                    <Swatch color="var(--paper-warm)" bordered />
                    <Swatch color="var(--paper-deep)" bordered />
                  </div>
                  <div className="flex gap-2">
                    <Swatch color="var(--ink)" />
                    <Swatch color="var(--ink-soft)" />
                    <Swatch color="var(--ink-muted)" />
                  </div>
                  <div className="flex gap-2">
                    <Swatch color="var(--terracotta)" pill />
                    <Swatch color="var(--moss)" pill />
                    <Swatch color="var(--indigo)" pill />
                    <Swatch color="var(--gold)" pill />
                  </div>
                </div>
                <p className="m-0 mt-auto text-sm leading-normal text-ink-soft">
                  Three paper tones, three inks, four pigments — re-cut for every theme.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-paper">
              <CardContent className="flex h-full flex-col gap-[18px]">
                <SpecimenLabel>Type</SpecimenLabel>
                <div className="flex items-baseline gap-3.5">
                  <span className="font-display text-[64px] leading-none text-foreground [font-variation-settings:var(--fraunces-display)]">Aa</span>
                  <span className="font-sans text-[30px] font-medium leading-none text-muted-foreground">Aa</span>
                </div>
                <p className="m-0 mt-auto text-sm leading-normal text-ink-soft">
                  Fraunces carries the voice; Raleway does the work. One italic word per headline, always in the accent pigment.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-paper">
              <CardContent className="flex h-full flex-col gap-[18px]">
                <SpecimenLabel>Texture &amp; elevation</SpecimenLabel>
                <div className="flex items-end gap-4 px-0.5 pt-2 pb-3">
                  <span className="h-[52px] w-[52px] rounded-sm border border-[var(--line-faint)] bg-paper-warm shadow-sm" />
                  <span className="h-[52px] w-[52px] rounded-lg border border-[var(--line-faint)] bg-paper-warm shadow-md" />
                  <span className="h-[52px] w-[52px] rounded-xl border border-[var(--line-faint)] bg-paper-warm shadow-lg" />
                </div>
                <p className="m-0 mt-auto text-sm leading-normal text-ink-soft">
                  Fractal paper grain, gentle radii, and three steps of warm ink shadow — never a hard drop.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-paper">
              <CardContent className="flex h-full flex-col gap-[18px]">
                <SpecimenLabel>The mark</SpecimenLabel>
                <div className="flex items-center gap-[18px]">
                  <span className="inline-flex rounded-sm border border-[var(--line-soft)] p-1.5">
                    <QuillMark size={64} />
                  </span>
                  {/* Favicon tiles: paper fill in light, no fill in dark — the
                      mark swaps to its cream cut so it stays visible on walnut. */}
                  <div className="flex items-end gap-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/home/quill-mark.svg" alt="32px favicon" width={32} height={32} className="block rounded-xs border border-[var(--line-soft)] bg-[#F5EDDD] p-[3px] dark:hidden" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/home/quill-mark-cream.svg" alt="32px favicon" width={32} height={32} className="hidden rounded-xs border border-[var(--line-soft)] bg-transparent p-[3px] dark:block" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/home/quill-mark-16.svg" alt="16px favicon" width={16} height={16} className="block rounded-xs border border-[var(--line-soft)] bg-[#F5EDDD] p-px dark:hidden" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/home/quill-mark-cream.svg" alt="16px favicon" width={16} height={16} className="hidden rounded-xs border border-[var(--line-soft)] bg-transparent p-px dark:block" />
                  </div>
                </div>
                <p className="m-0 mt-auto text-sm leading-normal text-ink-soft">
                  The quill, set in ink. Ships as SVG, a full favicon set, and lock-ups in three sizes.
                </p>
                <a href={storyUrl("foundations-brand--docs")} className="text-sm font-medium text-[var(--link)] no-underline transition-colors duration-200 hover:text-[var(--accent-pigment)]">
                  View the lock-ups →
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ── Components ──────────────────────────────────────────────────── */}
      <section id="components" className="bg-background">
        <div className="mx-auto max-w-[1400px] px-12 py-24 max-sm:px-6 max-sm:py-12">
          <SectionHeader
            eyebrow="The collection"
            title={<>Every component, a <Accent>specimen</Accent>.</>}
            caption="Designed with intent and taste."
          />
          <div className="grid grid-cols-[400px_minmax(0,1fr)] items-start gap-6 max-lg:grid-cols-1">
            <div className="flex flex-col gap-3">
              <SpecimenLabel>Specimen 01 · Card</SpecimenLabel>
              <Card>
                <CardHeader>
                  <CardTitle className="[font-variation-settings:var(--fraunces-text)]">Meeting Mapper</CardTitle>
                  <CardAction>
                    <Badge variant="outline">004</Badge>
                  </CardAction>
                  <CardDescription>
                    Turns a rambling hour into a tidy map of decisions, owners, and loose threads.
                  </CardDescription>
                </CardHeader>
                <CardFooter className="gap-3">
                  <Avatar>
                    <AvatarFallback>MM</AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground">Built by the team</span>
                  <a href={storyUrl("components-card--docs")} className="ml-auto text-sm font-medium text-primary no-underline hover:underline hover:underline-offset-4">
                    View →
                  </a>
                </CardFooter>
              </Card>
              <SpecimenLabel className="mt-3">Specimen 02 · Avatar</SpecimenLabel>
              <Card>
                <CardContent className="flex items-center gap-4 p-1 px-5">
                  <Avatar size="lg">
                    <AvatarFallback>AL</AvatarFallback>
                  </Avatar>
                  <Avatar>
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                  <Avatar size="sm">
                    <AvatarFallback>Q</AvatarFallback>
                  </Avatar>
                  <span className="ml-auto text-xs text-muted-foreground">lg · default · sm</span>
                </CardContent>
              </Card>
              <SpecimenLabel className="mt-3">Specimen 03 · Switch</SpecimenLabel>
              <Card>
                <CardContent className="flex items-center gap-6 p-1 px-5">
                  <Label className="cursor-pointer gap-2">
                    <Switch checked={specimenOn} onCheckedChange={setSpecimenOn} />
                    Notifications
                  </Label>
                  <span className="ml-auto text-xs text-muted-foreground">checked bg-primary · thumb bg-background</span>
                </CardContent>
              </Card>
            </div>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <SpecimenLabel>Specimen 04 · Button — all variants</SpecimenLabel>
                <Card>
                  <CardContent className="flex flex-wrap items-center gap-2 p-1 px-5">
                    <Button>default</Button>
                    <Button variant="outline">outline</Button>
                    <Button variant="secondary">secondary</Button>
                    <Button variant="ghost">ghost</Button>
                    <Button variant="destructive">destructive</Button>
                    <Button variant="link">link</Button>
                  </CardContent>
                </Card>
              </div>
              <div className="flex flex-col gap-3">
                <SpecimenLabel>Specimen 05 · Badge — all variants</SpecimenLabel>
                <Card>
                  <CardContent className="flex flex-wrap items-center gap-2 p-1 px-5">
                    <Badge>New</Badge>
                    <Badge variant="secondary">Beta</Badge>
                    <Badge variant="destructive">Error</Badge>
                    <Badge variant="outline">Draft</Badge>
                    <Badge variant="ghost">Archive</Badge>
                    <Badge variant="link">View details</Badge>
                  </CardContent>
                </Card>
              </div>
              <div className="flex flex-col gap-3">
                <SpecimenLabel>Specimen 06 · Field</SpecimenLabel>
                <Card>
                  <CardContent className="p-1 px-5">
                    <div className="flex max-w-[420px] flex-col gap-2">
                      <Label htmlFor="specimen-email">Your email</Label>
                      <Input id="specimen-email" type="email" placeholder="your@email.com" />
                      <span className="text-xs text-muted-foreground">No spam. Unsubscribe any time.</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
          <div className="mt-12 flex justify-center">
            <a href={STORYBOOK_URL} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary no-underline transition-all duration-200 hover:underline hover:underline-offset-4">
              Browse every story <span aria-hidden>→</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── Principles ──────────────────────────────────────────────────── */}
      <section id="principles" className="border-y border-[var(--line-faint)] bg-paper-warm">
        <div className="mx-auto flex max-w-[800px] flex-col items-center gap-7 px-12 pt-24 pb-[72px] text-center max-sm:px-6 max-sm:pt-14 max-sm:pb-10">
          <span className="font-display text-3xl leading-none text-[var(--accent-pigment)]">&mdash;</span>
          <p className="m-0 font-display text-2xl font-normal leading-[1.45] tracking-[-0.02em] text-foreground [font-variation-settings:var(--fraunces-display)] [text-wrap:pretty] max-sm:text-xl">
            &ldquo;People sit at the core of our design system and shape what good looks like: distinctive yet
            familiar, with a flair of style that makes it easy to come back to every day.&rdquo;
          </p>
        </div>
        <div className="mx-auto max-w-[1400px] px-12 pb-24 max-sm:px-6 max-sm:pb-14">
          <div className="grid grid-cols-3 gap-12 border-t border-[var(--line-soft)] pt-12 max-md:grid-cols-1 max-sm:gap-8 max-sm:pt-8">
            {[
              ["01", "Paper first", "Every surface, a texture you can almost feel with a typeset that has an unhurried editorial rhythm."],
              ["02", "One italic word", "Emphasis is earned. A single accented italic per headline — never two, never shouted."],
              ["03", "A gentle settle", "Hovers lift, presses set down. Nothing bounces, nothing loops, nothing hurries you along."],
            ].map(([num, title, body]) => (
              <div key={num} className="flex flex-col gap-2.5">
                <span className="font-display text-base italic text-[var(--accent-pigment)] [font-variation-settings:var(--fraunces-caption)]">{num}</span>
                <h3 className="m-0 font-display text-xl font-normal text-foreground [font-variation-settings:var(--fraunces-text)]">{title}</h3>
                <p className="m-0 text-sm leading-reading text-ink-soft">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Getting started ─────────────────────────────────────────────── */}
      <section id="start" className="bg-background">
        <div className="mx-auto grid max-w-[1400px] grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-center gap-16 px-12 py-24 max-lg:grid-cols-1 max-sm:gap-8 max-sm:px-6 max-sm:py-12">
          <div className="flex flex-col items-start gap-6">
            <span className="font-sans text-xs font-medium tracking-eyebrow uppercase text-ink-muted">Getting started</span>
            <h2 className="m-0 font-display text-3xl font-normal leading-heading tracking-display text-foreground [font-variation-settings:var(--fraunces-display)] max-sm:text-2xl">
              Begin with a single <Accent>command</Accent>.
            </h2>
            <p className="m-0 max-w-[460px] text-[1rem] leading-reading text-ink-soft">
              Add the Quill theme with the shadcn CLI, import from the registry, and compose. The Storybook holds a
              story for every component, every state, both themes.
            </p>
            <Button variant="outline" render={<a href={storyUrl("foundations-introduction--docs")} />}>
              Read the full guide <span aria-hidden>→</span>
            </Button>
          </div>
          {/* The code card stays dark in both themes. */}
          <div className="overflow-x-auto rounded-lg bg-[#2A2622] p-7 px-8 font-mono text-sm leading-loose text-[#F5EDDD] shadow-md max-sm:p-4 max-sm:text-xs">
            <div className="text-[rgba(245,237,221,0.55)]"># add the quill theme</div>
            <div>
              npx shadcn add <span className="text-[#D6BA86]">https://www.quilldesignsystem.com/r/quill.json</span>
            </div>
            <div className="h-[1em]" />
            <div className="text-[rgba(245,237,221,0.55)]">{"// page.tsx"}</div>
            <div>
              <span className="text-[#DB8568]">import</span> {"{ Button }"} <span className="text-[#DB8568]">from</span>{" "}
              <span className="text-[#D6BA86]">&quot;@/components/ui/button&quot;</span>
            </div>
            <div>
              <span className="text-[#DB8568]">import</span> {"{ Card, CardHeader }"}{" "}
              <span className="text-[#DB8568]">from</span> <span className="text-[#D6BA86]">&quot;@/components/ui/card&quot;</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="bg-background">
        <div className="h-px bg-[linear-gradient(90deg,transparent,var(--line-strong),transparent)]" />
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-8 px-12 pt-12 pb-14 max-md:flex-col max-sm:gap-6 max-sm:px-6 max-sm:pt-8 max-sm:pb-10">
          <div className="flex items-center gap-3.5">
            <Logo />
            <span className="text-sm text-ink-soft">— A design system, made for people.</span>
          </div>
          <span className="font-display text-sm italic text-muted-foreground [font-variation-settings:var(--fraunces-caption)]">
            v{packageJson.version}
          </span>
        </div>
      </footer>
    </div>
  );
}
