import { create } from "zustand";

export type LayoutMode = "embedding" | "geographic";

export interface DataPoint {
  id: string;
  loc_id: string;
  geo_lat: number;
  geo_lon: number;
  emb_x: number;
  emb_y: number;
  timestamp: Date;
  cat_a: string;
  cat_b: string;
  cat_c: string;
  num_a: number;
  num_b: number;
}

export interface QueryExchange {
  id: string;
  prompt: string;
  response: string;
  at: Date;
}

interface AppState {
  data: DataPoint[];
  layout: LayoutMode;
  catFilters: Record<"cat_a" | "cat_b" | "cat_c", Set<string>>;
  dateRange: [Date | null, Date | null];
  hoverId: string | null;
  selection: Set<string>;
  queryLog: QueryExchange[];
  setData: (rows: DataPoint[]) => void;
  setLayout: (layout: LayoutMode) => void;
  toggleCategory: (field: "cat_a" | "cat_b" | "cat_c", value: string) => void;
  setDateRange: (range: [Date | null, Date | null]) => void;
  setHoverId: (id: string | null) => void;
  setSelection: (ids: string[]) => void;
  appendQuery: (prompt: string, response: string) => void;
}

const emptySet = () => new Set<string>();

export const useAppState = create<AppState>((set) => ({
  data: [],
  layout: "embedding",
  catFilters: {
    cat_a: emptySet(),
    cat_b: emptySet(),
    cat_c: emptySet(),
  },
  dateRange: [null, null],
  hoverId: null,
  selection: new Set<string>(),
  queryLog: [],
  setData: (rows) =>
    set(() => ({
      data: rows,
      dateRange: rows.length
        ? ([rows[0].timestamp, rows[rows.length - 1].timestamp] as [Date, Date])
        : [null, null],
    })),
  setLayout: (layout) => set(() => ({ layout })),
  toggleCategory: (field, value) =>
    set((state) => {
      const next = new Set(state.catFilters[field]);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return {
        catFilters: {
          ...state.catFilters,
          [field]: next,
        },
      };
    }),
  setDateRange: (range) => set(() => ({ dateRange: range })),
  setHoverId: (id) => set(() => ({ hoverId: id })),
  setSelection: (ids) => set(() => ({ selection: new Set(ids) })),
  appendQuery: (prompt, response) =>
    set((state) => ({
      queryLog: [
        ...state.queryLog,
        { id: crypto.randomUUID(), prompt, response, at: new Date() },
      ],
    })),
}));

export function getFilteredPoints(state: AppState): DataPoint[] {
  const [start, end] = state.dateRange;
  return state.data.filter((row) => {
    if (start && row.timestamp < start) return false;
    if (end && row.timestamp > end) return false;

    for (const field of ["cat_a", "cat_b", "cat_c"] as const) {
      const active = state.catFilters[field];
      if (active.size > 0 && !active.has(row[field])) {
        return false;
      }
    }

    if (state.selection.size > 0 && !state.selection.has(row.loc_id)) {
      return false;
    }

    return true;
  });
}

export function uniqueValues(rows: DataPoint[], field: "cat_a" | "cat_b" | "cat_c"): string[] {
  return Array.from(new Set(rows.map((row) => row[field]))).sort();
}
