Dummy Data Generator — Spec
CLI
python scripts/generate_dummy_points.py \
  --n_locations 1000 \
  --times 5 \
  --seed 42 \
  --lat_min 43.5 --lat_max 44.5 \
  --lon_min -103.5 --lon_max -102.5 \
  --year 2023 \
  --k_clusters 5 \
  --out_parquet data/dummy_points.parquet \
  --out_csv data/dummy_points.sample.csv
Generation logic (deterministic with --seed)
Sample geographic locations
Uniform in the given lat/lon rectangle.
Create N_locations unique loc_id.
Sample embedding base points (mixture of Gaussians on a circle)
Choose k = k_clusters cluster centroids on the unit circle at equal angles.
For each location, sample (emb_x, emb_y) from a Gaussian around one centroid (small σ), so categories are spatially coherent in embedding space.
Assign categorical columns (cluster-aligned)
cat_a (primary theme): map centroid index → label set, e.g.
0: "mine", 1: "forest", 2: "water", 3: "urban", 4: "rangeland".
cat_b (compass): compute angle theta = atan2(emb_y, emb_x) and bucket into north|east|south|west|center (center if r < 0.25).
cat_c (tier): within each cluster, assign tier1|tier2|tier3 with skewed probabilities (e.g., 0.6/0.3/0.1) to create cluster-specific flavor.
Create time series
For each loc_id, create T timestamps (e.g., 5 dates spaced Jan→May 2023).
Optionally add tiny temporal drift to (emb_x, emb_y) (e.g., + ε) so charts can wiggle over time without breaking cluster coherence.
Numerical columns (smooth, embedding-coherent)
Convert to polar: r = sqrt(emb_x^2 + emb_y^2), theta = atan2(emb_y, emb_x).
num_a = 10 * r + Normal(0, 0.3) (radial gradient)
num_b = 5 * sin(2*theta) + 2 * (1 - r) + Normal(0, 0.3) (orthogonal pattern)
Optional cluster bias: add small centroid-specific offsets to num_a/num_b.
Row assembly
For each (loc_id, time) pair, produce a row with:
Stable id = uuid5(namespace=loc_id, name=timestamp_iso) (or incremental).
(geo_lat, geo_lon) from the location
(emb_x, emb_y) with tiny temporal drift
timestamp, cat_a, cat_b, cat_c, num_a, num_b
Validation checks
Ensure emb_x^2 + emb_y^2 ≤ 1.0 (clip rare outliers).
Check each cluster has ≥ 10% of points (adjust σ or resample if too imbalanced).
Print summary: counts per cat_a, ranges of num_a/num_b, first/last dates.
Outputs
Write full table to Parquet (snappy).
Write first 200 rows to CSV for quick inspection.
Emit schema.json (optional) describing columns & types.
Data schema (JSON)
{
  "id": "string",
  "loc_id": "string",
  "geo_lat": "float64",
  "geo_lon": "float64",
  "emb_x": "float32",
  "emb_y": "float32",
  "timestamp": "datetime64[ns]",
  "cat_a": "category",
  "cat_b": "category",
  "cat_c": "category",
  "num_a": "float32",
  "num_b": "float32"
}
Pseudocode
set_seed(seed)
centroids = circle_centroids(k_clusters)  # unit circle points
σ = 0.12

locations = []
for i in range(n_locations):
    lat = uniform(lat_min, lat_max)
    lon = uniform(lon_min, lon_max)
    c = randint(0, k_clusters-1)
    emb = sample_gaussian(centroids[c], σ)  # clip to unit disk
    cat_a = map_cluster_to_cat_a[c]
    theta = atan2(emb.y, emb.x); r = sqrt(emb.x**2 + emb.y**2)
    cat_b = compass_bucket(theta, r)
    cat_c = skewed_choice(["tier1", "tier2", "tier3"], [0.6, 0.3, 0.1])
    locations.append((loc_id, lat, lon, emb, cat_a, cat_b, cat_c))

rows = []
dates = spaced_dates(year, T=times)
for (loc_id, lat, lon, emb, cat_a, cat_b, cat_c) in locations:
    for t in dates:
        emb_t = emb + Normal(0, 0.01)  # tiny drift
        r, th = to_polar(emb_t)
        num_a = 10*r + Normal(0, 0.3)
        num_b = 5*sin(2*th) + 2*(1-r) + Normal(0, 0.3)
        id = uuid5(loc_id, t.isoformat())
        rows.append({...})

to_parquet(rows, out_parquet)
to_csv(head(rows, 200), out_csv)
Test plan
Distribution checks: histogram of r, num_a, num_b; counts per cat_a.
Coherence checks:
Mean num_a increases with r.
cat_a clusters form visible blobs in (emb_x, emb_y).
Temporal: per-loc_id (emb_x, emb_y) drift < 0.05 on average.