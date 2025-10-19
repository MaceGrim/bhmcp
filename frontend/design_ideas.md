Awesome — here’s a copy-paste-ready starter you can drop into a fresh React + Tailwind app. It sets a navy + burnt-orange NASA-punk theme and includes core components (Card, Button, Tabs, Toggle, and an SVG RadialGauge) plus a demo page.
0) Init (Vite + Tailwind)
# React + TS
npm create vite@latest nasa-punk-ui -- --template react-ts
cd nasa-punk-ui
npm i -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm i class-variance-authority clsx
1) Tailwind config
tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // core palette
        ink:   { DEFAULT: "#0B0D10",  50: "#0B0D10" }, // deep navy
        panel: "rgba(255,255,255,0.06)",
        line:  "rgba(255,255,255,0.14)",
        text:  { primary: "#E6E6E6", secondary: "#9CA3AF", muted: "#7A828E" },
        accent:{ DEFAULT: "#C76A2A" }, // burnt orange
        glow:  { DEFAULT: "rgba(199,106,42,0.6)" },
      },
      fontFamily: {
        ui: ["Inter", "system-ui", "Avenir", "Helvetica", "Arial", "sans-serif"],
        label: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        panel: "0 0 0 1px rgba(255,255,255,0.1), 0 6px 20px rgba(0,0,0,0.45)",
        glow: "0 0 0 1px rgba(199,106,42,0.35), 0 0 16px rgba(199,106,42,0.45)",
      },
      backdropBlur: { xs: "2px" },
      borderRadius: { panel: "6px" },
      spacing: { 18: "4.5rem" },
    },
  },
  plugins: [],
};
export default config;
2) Global styles (noise + base)
src/index.css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Subtle film grain overlay */
:root {
  --noise-opacity: 0.06;
  --grid-line: rgba(255,255,255,0.06);
}

html, body, #root {
  height: 100%;
  background: #0B0D10; /* ink */
  color: #E6E6E6;
  font-feature-settings: "ss01" on, "ss02" on;
}

/* optional: import fonts (replace with self-hosting in prod) */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&family=IBM+Plex+Mono:wght@400;500&display=swap');

.noise-layer::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image: url("data:image/svg+xml;utf8,\
  <svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'>\
  <filter id='n'>\
    <feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/>\
    <feColorMatrix type='saturate' values='0'/>\
  </filter>\
  <rect width='100%' height='100%' filter='url(%23n)' opacity='0.08'/>\
  </svg>");
  mix-blend-mode: overlay;
  opacity: var(--noise-opacity);
  z-index: 50;
}

/* faint grid option for panels */
.grid-bg {
  background-image:
    linear-gradient(var(--grid-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
  background-size: 24px 24px, 24px 24px;
}
3) Theme tokens (optional helper)
src/theme/nasaPunk.ts
export const theme = {
  colors: {
    bg: "#0B0D10",
    panel: "rgba(255,255,255,0.06)",
    line: "rgba(255,255,255,0.14)",
    text: { primary: "#E6E6E6", secondary: "#9CA3AF" },
    accent: "#C76A2A", // burnt orange
    glow: "rgba(199,106,42,0.45)",
  },
  radius: 6,
  gap: 24,
  blur: 4,
};
4) Utility helpers
src/lib/cn.ts
import { clsx } from "clsx";
export const cn = (...args: any[]) => clsx(args);
5) Core components
Card / Panel
src/components/Panel.tsx
import { cn } from "../lib/cn";

type Props = React.HTMLAttributes<HTMLDivElement> & { inset?: boolean };

export function Panel({ className, inset, ...props }: Props) {
  return (
    <div
      className={cn(
        "rounded-panel bg-panel border border-[color:var(--line,rgba(255,255,255,0.14))]",
        "backdrop-blur-xs shadow-panel",
        inset && "p-4 md:p-6 grid-bg",
        className
      )}
      {...props}
    />
  );
}
Button
src/components/Button.tsx
import { cn } from "../lib/cn";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "ghost" | "solid" | "outline";
};

export function Button({ className, variant = "outline", ...props }: Props) {
  const base = "px-4 h-10 rounded-md font-label tracking-wide uppercase text-sm";
  const styles = {
    outline:
      "border border-line text-text-primary hover:shadow-glow transition-shadow",
    solid:
      "bg-accent text-black hover:brightness-110 transition-colors",
    ghost:
      "text-text-secondary hover:text-text-primary hover:bg-white/5",
  } as const;

  return <button className={cn(base, styles[variant], className)} {...props} />;
}
Tabs
src/components/Tabs.tsx
import { cn } from "../lib/cn";
import { useState } from "react";

type Tab = { id: string; label: string; content: React.ReactNode };

export function Tabs({ tabs, defaultId }: { tabs: Tab[]; defaultId?: string }) {
  const [active, setActive] = useState(defaultId ?? tabs[0]?.id);
  return (
    <div className="w-full">
      <div className="flex gap-6 border-b border-line">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={cn(
              "py-3 font-label tracking-wide uppercase text-sm text-text-secondary",
              active === t.id && "text-text-primary relative",
              active === t.id &&
                "after:absolute after:-bottom-[1px] after:left-0 after:right-0 after:h-[2px] after:bg-accent"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="pt-4">
        {tabs.find(t => t.id === active)?.content}
      </div>
    </div>
  );
}
Toggle (console-style switch)
src/components/Toggle.tsx
import { useState } from "react";
import { cn } from "../lib/cn";

export function Toggle({ label, defaultOn = false }: { label: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      onClick={() => setOn(v => !v)}
      className={cn(
        "inline-flex items-center gap-3 select-none",
        "font-label uppercase tracking-wide text-sm"
      )}
    >
      <span className="text-text-secondary">{label}</span>
      <span
        className={cn(
          "relative w-14 h-7 border border-line rounded-md transition-colors",
          on ? "bg-accent/20" : "bg-white/5"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-6 w-6 rounded-sm bg-accent transition-transform",
            on && "translate-x-7"
          )}
        />
      </span>
    </button>
  );
}
Radial Gauge (SVG, segmented NASA-style)
src/components/RadialGauge.tsx
type Props = {
  value: number;   // 0..1
  size?: number;   // px
  label?: string;
};

export function RadialGauge({ value, size = 160, label = "POWER" }: Props) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const arc = circumference * value;

  return (
    <div style={{ width: size, height: size }} className="relative">
      <svg width={size} height={size} className="block">
        {/* background ring */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={stroke}
          strokeDasharray={`${circumference}`}
          strokeDashoffset={0}
        />
        {/* value arc */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#C76A2A"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${arc} ${circumference - arc}`}
          transform={`rotate(-90 ${cx} ${cy})`}
          className="drop-shadow-[0_0_8px_rgba(199,106,42,0.55)] transition-[stroke-dasharray] duration-300"
        />
        {/* tick marks */}
        {Array.from({ length: 40 }).map((_, i) => {
          const a = (i / 40) * 2 * Math.PI;
          const ir = r - 12, or = r - 6;
          const x1 = cx + ir * Math.cos(a);
          const y1 = cy + ir * Math.sin(a);
          const x2 = cx + or * Math.cos(a);
          const y2 = cy + or * Math.sin(a);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(255,255,255,0.25)"
              strokeWidth={i % 5 === 0 ? 2 : 1}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="font-label text-text-secondary tracking-[0.12em] uppercase text-xs">{label}</div>
        <div className="font-label text-2xl mt-1">{Math.round(value * 100)}%</div>
      </div>
    </div>
  );
}
6) Demo page
src/App.tsx
import { Panel } from "./components/Panel";
import { Button } from "./components/Button";
import { Tabs } from "./components/Tabs";
import { Toggle } from "./components/Toggle";
import { RadialGauge } from "./components/RadialGauge";

export default function App() {
  return (
    <div className="noise-layer min-h-dvh">
      <main className="mx-auto max-w-[1400px] p-6 md:p-10">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="font-label uppercase tracking-[0.18em] text-xl">
            Mission Console
          </h1>
          <div className="flex gap-3">
            <Button variant="ghost">Diagnostics</Button>
            <Button variant="outline">Systems</Button>
            <Button variant="solid">Launch</Button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Panel inset className="md:col-span-2">
            <Tabs
              tabs={[
                { id: "telemetry", label: "Telemetry",
                  content: <div className="text-text-secondary">Live feeds, logs, charts…</div> },
                { id: "navigation", label: "Navigation",
                  content: <div className="text-text-secondary">Star maps and routes…</div> },
                { id: "systems", label: "Systems",
                  content: <div className="text-text-secondary">Subsystem status…</div> },
              ]}
            />
          </Panel>

          <Panel inset className="flex items-center justify-center">
            <RadialGauge value={0.72} label="Power" />
          </Panel>

          <Panel inset className="md:col-span-1">
            <div className="flex items-center justify-between">
              <Toggle label="Aux Thrusters" defaultOn />
              <Toggle label="Auto-Stab" />
            </div>
            <div className="mt-6 flex gap-3">
              <Button>Arm</Button>
              <Button variant="ghost">Standby</Button>
              <Button variant="solid">Execute</Button>
            </div>
          </Panel>

          <Panel inset className="md:col-span-2">
            <div className="font-label uppercase tracking-wide text-sm mb-2 text-text-secondary">
              Notes
            </div>
            <div className="text-text-secondary">
              Panels use translucent “glass,” thin borders, and a faint grid.
              Buttons glow with burnt-orange on hover. Typography mixes technical
              mono for labels with neutral sans for body content.
            </div>
          </Panel>
        </div>
      </main>
    </div>
  );
}
7) Wire into index
src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
index.html (ensure root + nice title)
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, viewport-fit=cover"
    />
    <title>NASA-Punk Console</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
Notes for your dev
Accessibility: keep contrast ≥ 4.5:1 on critical text; the accent orange is for emphasis, not body text. All interactive elements are buttons/controls with focus rings (Tailwind focus styles can be added as needed).
Performance: backdrop blur is lightweight here (backdrop-blur-xs); avoid stacking many blurs on mobile.
Brand tuning: adjust accent if you want slightly darker or redder burnt orange; the gauge accepts 0..1 values and animates via stroke-dasharray.