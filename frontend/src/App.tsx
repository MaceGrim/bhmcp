import { useEffect, useMemo, useRef, useState } from "react";
import { csvParse } from "d3-dsv";
import { scaleLinear } from "d3-scale";
import { extent } from "d3-array";
import { useAppState, getFilteredPoints, DataPoint, type LayoutMode } from "./state/store";
import { QueryBar } from "./ui/QueryBar";
import { Button } from "./ui/Button";
import { renderScatter, type ScatterPalette } from "./canvas/Scatter";

const palette: ScatterPalette = {
  background: "#f4f5f8",
  colors: {
    mine: "#ff4d6d",
    forest: "#00c3a8",
    water: "#2874ff",
    urban: "#ffae00",
    rangeland: "#845ef7",
    grassland: "#58d68d",
    agriculture: "#ff6ec7",
    wetland: "#2bb0ed",
  } as Record<string, string>,
  defaultColor: "#ff7b45",
  accentStroke: "#1c2a4a",
  highlightAlpha: 0.95,
  mutedAlpha: 0.1,
};

interface Dimensions {
  width: number;
  height: number;
}

export default function App() {
  const setData = useAppState((s) => s.setData);
  const layout = useAppState((s) => s.layout);
  const setLayout = useAppState((s) => s.setLayout);
  const hoverId = useAppState((s) => s.hoverId);
  const setHoverId = useAppState((s) => s.setHoverId);
  const data = useAppState((s) => s.data);
  const filtered = useAppState(getFilteredPoints);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState<Dimensions>({ width: 960, height: 560 });
  const [transition, setTransition] = useState<{
    source: LayoutMode;
    target: LayoutMode;
    start: number;
  } | null>(null);
  const [animProgress, setAnimProgress] = useState(1);

  useEffect(() => {
    fetch("/sample.csv")
      .then((response) => response.text())
      .then((text) => {
        const parsed = csvParse(text);
        const rows: DataPoint[] = parsed.map((row) => ({
          id: String(row.id),
          loc_id: String(row.loc_id),
          geo_lat: Number(row.geo_lat),
          geo_lon: Number(row.geo_lon),
          emb_x: Number(row.emb_x),
          emb_y: Number(row.emb_y),
          timestamp: new Date(row.timestamp as string),
          cat_a: String(row.cat_a),
          cat_b: String(row.cat_b),
          cat_c: String(row.cat_c),
          num_a: Number(row.num_a),
          num_b: Number(row.num_b),
        }));
        rows.sort((a, b) => a.timestamp.valueOf() - b.timestamp.valueOf());
        setData(rows);
      })
      .catch((error) => {
        console.error("Failed to load sample.csv", error);
      });
  }, [setData]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (width === 0) {
          continue;
        }
        const height = Math.max(width * 0.56, 420);
        setDimensions((prev) => {
          if (Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1) {
            return prev;
          }
          return { width, height };
        });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!transition) return;
    const duration = 750;
    let frame = 0;

    const tick = (now: number) => {
      const elapsed = now - transition.start;
      const linear = Math.min(1, elapsed / duration);
      const eased = 0.5 - 0.5 * Math.cos(Math.PI * linear);
      setAnimProgress(eased);
      if (linear < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setAnimProgress(1);
        setTransition(null);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [transition]);

  const projectors = useMemo(() => {
    if (!data.length) {
      return null;
    }

    const width = dimensions.width;
    const height = dimensions.height;

    const embScaleX = scaleLinear().domain([-1.05, 1.05]).range([32, width - 32]).clamp(true);
    const embScaleY = scaleLinear().domain([-1.05, 1.05]).range([height - 32, 32]).clamp(true);

    const latExtent = extent(data, (d) => d.geo_lat) as [number, number];
    const lonExtent = extent(data, (d) => d.geo_lon) as [number, number];

    const latMin = latExtent[0] ?? 0;
    const latMax = latExtent[1] ?? latMin + 1;
    const lonMin = lonExtent[0] ?? 0;
    const lonMax = lonExtent[1] ?? lonMin + 1;

    const latRange = latMax === latMin ? [latMin - 0.5, latMax + 0.5] : [latMin, latMax];
    const lonRange = lonMax === lonMin ? [lonMin - 0.5, lonMax + 0.5] : [lonMin, lonMax];

    const geoScaleX = scaleLinear().domain(lonRange as [number, number]).range([32, width - 32]).clamp(true);
    const geoScaleY = scaleLinear().domain(latRange as [number, number]).range([height - 32, 32]).clamp(true);

    return {
      embedding: (point: DataPoint) => ({
        x: embScaleX(point.emb_x),
        y: embScaleY(point.emb_y),
      }),
      geographic: (point: DataPoint) => ({
        x: geoScaleX(point.geo_lon),
        y: geoScaleY(point.geo_lat),
      }),
    } satisfies Record<LayoutMode, (point: DataPoint) => { x: number; y: number }>;
  }, [data, dimensions]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !projectors) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio ?? 1;
    const displayWidth = Math.floor(dimensions.width);
    const displayHeight = Math.floor(dimensions.height);
    canvas.width = Math.floor(displayWidth * dpr);
    canvas.height = Math.floor(displayHeight * dpr);
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const highlightIds = new Set(filtered.map((row) => row.loc_id));
    const blend = transition
      ? { source: transition.source, target: transition.target, progress: animProgress }
      : undefined;

    renderScatter({
      ctx,
      width: displayWidth,
      height: displayHeight,
      points: data,
      layout,
      highlightIds,
      hoverId,
      palette,
      projectors,
      blend,
    });
  }, [layout, filtered, data, hoverId, dimensions, projectors, animProgress, transition]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !projectors) return;

    const sourceProj = transition ? projectors[transition.source] : projectors[layout];
    const targetProj = transition ? projectors[transition.target] : projectors[layout];
    const progress = transition ? animProgress : 1;

    const handlePointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      let nearest: { point: DataPoint; distance: number } | null = null;
      for (const point of filtered) {
        const from = sourceProj(point);
        const to = targetProj(point);
        const pos = {
          x: from.x + (to.x - from.x) * progress,
          y: from.y + (to.y - from.y) * progress,
        };
        const dx = pos.x - x;
        const dy = pos.y - y;
        const dist = dx * dx + dy * dy;
        if (!nearest || dist < nearest.distance) {
          nearest = { point, distance: dist };
        }
      }
      if (nearest && nearest.distance < 200) {
        setHoverId(nearest.point.id);
      } else {
        setHoverId(null);
      }
    };

    const handlePointerLeave = () => {
      setHoverId(null);
    };

    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [filtered, layout, projectors, setHoverId, transition, animProgress]);

  const hoveredPoint = useMemo(() => {
    if (!hoverId) return null;
    return data.find((row) => row.id === hoverId) ?? null;
  }, [hoverId, data]);

  const tooltipStyle = useMemo(() => {
    if (!hoveredPoint || !projectors || !canvasRef.current) return undefined;
    const sourceProj = transition ? projectors[transition.source] : projectors[layout];
    const targetProj = transition ? projectors[transition.target] : projectors[layout];
    const progress = transition ? animProgress : 1;
    const from = sourceProj(hoveredPoint);
    const to = targetProj(hoveredPoint);
    return {
      left: `${from.x + (to.x - from.x) * progress + 16}px`,
      top: `${from.y + (to.y - from.y) * progress + 16}px`,
    } as const;
  }, [hoveredPoint, projectors, layout, transition, animProgress]);

  const handleLayoutChange = (mode: LayoutMode) => {
    if (mode === layout) return;
    const now = performance.now();
    setTransition({ source: layout, target: mode, start: now });
    setAnimProgress(0);
    setLayout(mode);
  };

  return (
    <div className="scene-root">
      <div className="scene-stage" ref={containerRef}>
        <canvas ref={canvasRef} className="scene-canvas" />
      </div>

      {hoveredPoint && tooltipStyle ? (
        <div className="tooltip" style={tooltipStyle}>
          <h3>{hoveredPoint.cat_a}</h3>
          <dl>
            <dt>ID</dt>
            <dd>{hoveredPoint.loc_id.slice(0, 8)}…</dd>
            <dt>Timestamp</dt>
            <dd>{hoveredPoint.timestamp.toLocaleDateString()}</dd>
            <dt>Compass</dt>
            <dd>{hoveredPoint.cat_b}</dd>
            <dt>Tier</dt>
            <dd>{hoveredPoint.cat_c}</dd>
            <dt>Num A</dt>
            <dd>{hoveredPoint.num_a.toFixed(2)}</dd>
            <dt>Num B</dt>
            <dd>{hoveredPoint.num_b.toFixed(2)}</dd>
          </dl>
        </div>
      ) : null}
      <div className="scene-footer">
        <div className="layout-switch">
          {(["embedding", "geographic"] as const).map((mode) => (
            <Button
              key={mode}
              type="button"
              size="sm"
              variant="ghost"
              className={`layout-btn${layout === mode ? " active" : ""}`}
              onClick={() => handleLayoutChange(mode)}
            >
              {mode === "embedding" ? "Embedding" : "Geo"}
            </Button>
          ))}
        </div>
        <QueryBar />
      </div>
    </div>
  );
}
