import type { DataPoint, LayoutMode } from "../state/store";

export interface ScatterPalette {
  background: string;
  colors: Record<string, string>;
  defaultColor: string;
  accentStroke: string;
  highlightAlpha: number;
  mutedAlpha: number;
}

export interface ScatterOptions {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  points: DataPoint[];
  layout: LayoutMode;
  highlightIds: Set<string>;
  hoverId: string | null;
  palette: ScatterPalette;
  projectors: Record<LayoutMode, (point: DataPoint) => { x: number; y: number }>;
  blend?: {
    source: LayoutMode;
    target: LayoutMode;
    progress: number;
  };
}

export function renderScatter({
  ctx,
  width,
  height,
  points,
  layout,
  highlightIds,
  hoverId,
  palette,
  projectors,
  blend,
}: ScatterOptions) {
  ctx.clearRect(0, 0, width, height);

  if (points.length === 0) return;

  ctx.lineWidth = 1;

  const highlightStroke = palette.accentStroke;

  const fromProj = blend ? projectors[blend.source] : projectors[layout];
  const toProj = blend ? projectors[blend.target] : projectors[layout];
  const progress = blend ? clamp(blend.progress) : 1;

  for (const point of points) {
    const from = fromProj(point);
    const to = toProj(point);
    const px = lerp(from.x, to.x, progress);
    const py = lerp(from.y, to.y, progress);

    const isHighlighted = highlightIds.size === 0 || highlightIds.has(point.loc_id);
    const alpha = isHighlighted ? palette.highlightAlpha : palette.mutedAlpha;
    const baseColor = palette.colors[point.cat_a] ?? palette.defaultColor;
    ctx.fillStyle = applyAlpha(baseColor, alpha);
    ctx.beginPath();
    ctx.arc(px, py, isHighlighted ? 3.8 : 2.2, 0, Math.PI * 2);
    ctx.fill();

    if (hoverId && point.id === hoverId) {
      ctx.strokeStyle = highlightStroke;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(px, py, 6.2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function applyAlpha(hex: string, alpha: number) {
  const parsed = hex.replace("#", "");
  const bigint = parseInt(parsed, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function clamp(value: number) {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
