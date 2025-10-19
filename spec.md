MVP Spec — “Black Hills MCP (Prototype 0)”
1) Product goals (v0)
Interactive point cloud with two layouts:
Embedding space (2D circle)
Geographic space (square lat/lon)
Text box for simple natural-language queries (stubbed to a small intent parser).
Basic filters (date range, categorical facets) that highlight/animate the subset.
Smooth transitions between layouts and filtered states.
No real map tiles, no auth, no real LLM (MCP/LLM is a stub that returns structured filters).
2) Data model (single flat table)
One row = one (location × time) observation.
Columns
id: str — stable UUID per row.
loc_id: str — stable UUID per geographic location (repeats across time points).
geo_lat: float — latitude within a defined square (e.g., 43.5–44.5).
geo_lon: float — longitude within a defined square (e.g., −103.5 to −102.5).
emb_x: float — embedding X (inside unit circle).
emb_y: float — embedding Y (inside unit circle).
timestamp: datetime — 5 time points per loc_id (e.g., spaced monthly in 2023).
cat_a: str — cluster-driven category (e.g., mine|forest|water|urban|rangeland).
cat_b: str — secondary category aligned with clusters (e.g., north|south|east|west|center).
cat_c: str — tertiary label within clusters (e.g., tier1|tier2|tier3 skewed by cluster).
num_a: float — smooth function of (emb_x, emb_y) + small noise (e.g., radial r).
num_b: float — orthogonal smooth function (e.g., sin(theta) or cluster centroid distance).
Row count
N_locations = 1000
T = 5 timestamps per location → 5,000 rows total.
Serialization
Primary: data/dummy_points.parquet
Also export: data/dummy_points.sample.csv (first 200 rows for quick peeks)
3) Frontend (React + Vite)
Render tech: HTML <canvas> (2D) with batched draws using Float32Array.
State:
points (typed arrays for positions, colors, alpha)
layout ∈ {"embedding", "geographic"}
filters (date range, cat selections)
selection (ids), hoverId (id)
UI:
Top: title + layout toggle (Embedding / Geo)
Center: canvas
Right: filter panel
Date range (slider over 5 points)
Cat chips (multi-select): cat_a, cat_b, cat_c
Bottom: “Query” input + Run
Animations:
Layout tween: 450–700ms, ease in-out (interpolate from (emb_x, emb_y) → projected (lon, lat) scaled to canvas).
Filter emphasize: non-matching fade to 0.1 alpha over 250ms.
Hover: halo ring + sticky tooltip (shows small data card).
Tooltips (hover or click):
loc_id, timestamp
cat_* values
num_a, num_b
Color:
Base color by cat_a (category palette).
Opacity lowered for non-matches.
4) Backend (FastAPI minimal)
Endpoints (serve static JSON first; can be file-backed reads):
GET /health → { status: "ok" }
GET /schema → columns + types
POST /query
Request:
{
  "filters": {
    "timestamp": {"gte": "2023-01-01", "lte": "2023-12-31"},
    "cat_a": ["mine", "urban"],
    "cat_b": [],
    "cat_c": [],
    "num_a": {"gte": null, "lte": null},
    "num_b": {"gte": null, "lte": null}
  },
  "projection": "embedding"  // or "geographic"
}
Response: array of rows (or compact form with parallel arrays).
POST /nlp/parse (MCP/LLM stub)
Request: { "prompt": "show me mines in 2023" }
Response:
{
  "intent": "filter",
  "filters": {
    "timestamp": {"gte":"2023-01-01","lte":"2023-12-31"},
    "cat_a": ["mine"]
  }
}
Note: In v0 the frontend can skip the backend entirely and filter in-memory after loading dummy_points.parquet converted to JSON. Keep the API spec so you can swap later.
5) MCP/LLM stub (intent grammar)
Recognized patterns (case-insensitive, simple regex):
"mines" → cat_a=["mine"]
"forest"/"water"/"urban"/"rangeland" → map to cat_a
"in 2023" or "from 2023" → timestamp.gte=2023-01-01, lte=2023-12-31
"between {YYYY} and {YYYY}" → date range
"north|south|east|west|center" → cat_b filter
Output schema: same filters object as /query.
6) File layout
black-hills-mcp/
  frontend/
    src/
      App.tsx
      canvas/Scatter.ts
      state/store.ts
      api/client.ts
      ui/Filters.tsx
      ui/QueryBar.tsx
    public/
      sample.json          # optional JSON export of subset
    index.html
    package.json
    vite.config.ts
  backend/
    app.py                 # FastAPI
    requirements.txt
  data/
    dummy_points.parquet
    dummy_points.sample.csv
  scripts/
    generate_dummy_points.py
  README.md
7) Success criteria (v0)
Load 5k points
Toggle layouts with animation
Type “show me mines in 2023” → subset highlights
Lasso (optional v0.1) or click-to-inspect works
No backend required to demo (but API spec exists)