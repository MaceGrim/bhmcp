"""Generate dummy spatiotemporal point data for Black Hills MCP prototype."""
from __future__ import annotations

import argparse
import json
import math
import uuid
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd

# Default categorical labels per cluster index.
CAT_A_LABELS = [
    "mine",
    "forest",
    "water",
    "urban",
    "rangeland",
    "grassland",
    "agriculture",
    "wetland",
]
TIER_LABELS = ["tier1", "tier2", "tier3"]
TIER_BASE_PROBS = np.array([0.6, 0.3, 0.1])


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--n_locations", type=int, default=1000)
    parser.add_argument("--times", type=int, default=5, help="Number of timestamps per location")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--lat_min", type=float, default=43.5)
    parser.add_argument("--lat_max", type=float, default=44.5)
    parser.add_argument("--lon_min", type=float, default=-103.5)
    parser.add_argument("--lon_max", type=float, default=-102.5)
    parser.add_argument("--year", type=int, default=2023)
    parser.add_argument("--k_clusters", type=int, default=5)
    parser.add_argument("--sigma", type=float, default=0.12, help="Std dev for cluster Gaussian in embedding space")
    parser.add_argument(
        "--out_parquet",
        type=Path,
        default=Path("data/dummy_points.parquet"),
        help="Parquet output path",
    )
    parser.add_argument(
        "--out_csv",
        type=Path,
        default=Path("data/dummy_points.sample.csv"),
        help="CSV output path for first 200 rows",
    )
    parser.add_argument(
        "--sample_size",
        type=int,
        default=200,
        help="Number of rows to include in the sample CSV (<=0 to skip)",
    )
    parser.add_argument(
        "--schema_json",
        type=Path,
        default=None,
        help="Optional path to write schema JSON description",
    )
    return parser.parse_args()


def circle_centroids(k: int) -> np.ndarray:
    angles = np.linspace(0, 2 * math.pi, num=k, endpoint=False)
    return np.stack((np.cos(angles), np.sin(angles)), axis=1)


def ensure_unit_disk(vec: np.ndarray) -> np.ndarray:
    r = np.linalg.norm(vec)
    if r <= 1.0:
        return vec
    # Clip by scaling back to unit circle boundary.
    return vec / r * 0.999


def choose_cat_a(cluster_idx: int, k_clusters: int) -> str:
    if cluster_idx < len(CAT_A_LABELS):
        return CAT_A_LABELS[cluster_idx]
    # Fall back to repeating labels if there are more clusters than defaults.
    return CAT_A_LABELS[cluster_idx % len(CAT_A_LABELS)]


def tier_probs_for_cluster(cluster_idx: int) -> np.ndarray:
    # Rotate base probabilities per cluster to add mild flavor differences.
    shift = cluster_idx % len(TIER_BASE_PROBS)
    return np.roll(TIER_BASE_PROBS, shift)


def compass_bucket(theta: float, radius: float) -> str:
    if radius < 0.25:
        return "center"
    angle = (math.degrees(theta) + 360.0) % 360.0
    if 315 <= angle or angle < 45:
        return "east"
    if 45 <= angle < 135:
        return "north"
    if 135 <= angle < 225:
        return "west"
    return "south"


def spaced_dates(year: int, times: int) -> List[pd.Timestamp]:
    start = pd.Timestamp(year=year, month=1, day=1)
    return list(pd.date_range(start=start, periods=times, freq="MS"))


def generate_locations(
    n_locations: int,
    k_clusters: int,
    lat_range: Tuple[float, float],
    lon_range: Tuple[float, float],
    sigma: float,
    rng: np.random.Generator,
) -> List[Dict]:
    centroids = circle_centroids(k_clusters)
    lat_min, lat_max = lat_range
    lon_min, lon_max = lon_range
    locations: List[Dict] = []

    for idx in range(n_locations):
        lat = rng.uniform(lat_min, lat_max)
        lon = rng.uniform(lon_min, lon_max)

        cluster_idx = rng.integers(0, k_clusters)
        centroid = centroids[cluster_idx]
        emb = ensure_unit_disk(centroid + rng.normal(scale=sigma, size=2))

        theta = math.atan2(emb[1], emb[0])
        radius = math.hypot(emb[0], emb[1])

        cat_a = choose_cat_a(cluster_idx, k_clusters)
        cat_b = compass_bucket(theta, radius)
        probs = tier_probs_for_cluster(cluster_idx)
        cat_c = rng.choice(TIER_LABELS, p=probs)

        loc_uuid = uuid.uuid5(uuid.NAMESPACE_DNS, f"bhmcp-loc-{idx}")

        locations.append(
            {
                "loc_id": str(loc_uuid),
                "cluster_idx": cluster_idx,
                "lat": lat,
                "lon": lon,
                "emb": emb,
                "cat_a": cat_a,
                "cat_b": cat_b,
                "cat_c": cat_c,
            }
        )

    return locations


def generate_rows(
    locations: List[Dict],
    dates: List[pd.Timestamp],
    rng: np.random.Generator,
    sigma_drift: float = 0.01,
) -> List[Dict]:
    rows: List[Dict] = []
    cluster_offsets = {}

    # Precompute deterministic offsets per cluster id for numeric columns.
    for loc in locations:
        cluster = loc["cluster_idx"]
        if cluster not in cluster_offsets:
            center_bias = (cluster - np.mean([l["cluster_idx"] for l in locations])) / max(len(locations), 1)
            cluster_offsets[cluster] = {
                "num_a": 0.5 * center_bias,
                "num_b": -0.5 * center_bias,
            }

    for loc in locations:
        emb_base = loc["emb"]
        loc_uuid = uuid.UUID(loc["loc_id"])
        cluster_bias = cluster_offsets[loc["cluster_idx"]]

        for ts in dates:
            emb = ensure_unit_disk(emb_base + rng.normal(scale=sigma_drift, size=2))
            x, y = emb
            radius = math.hypot(x, y)
            theta = math.atan2(y, x)

            num_a = 10.0 * radius + rng.normal(scale=0.3) + cluster_bias["num_a"]
            num_b = 5.0 * math.sin(2 * theta) + 2.0 * (1 - radius) + rng.normal(scale=0.3) + cluster_bias["num_b"]

            row_uuid = uuid.uuid5(loc_uuid, ts.isoformat())

            rows.append(
                {
                    "id": str(row_uuid),
                    "loc_id": str(loc_uuid),
                    "geo_lat": loc["lat"],
                    "geo_lon": loc["lon"],
                    "emb_x": x,
                    "emb_y": y,
                    "timestamp": ts,
                    "cat_a": loc["cat_a"],
                    "cat_b": loc["cat_b"],
                    "cat_c": loc["cat_c"],
                    "num_a": num_a,
                    "num_b": num_b,
                }
            )

    return rows


def validate_clusters(locations: List[Dict]) -> Dict[int, int]:
    counts: Dict[int, int] = {}
    for loc in locations:
        counts[loc["cluster_idx"]] = counts.get(loc["cluster_idx"], 0) + 1
    total = sum(counts.values())
    for cluster, count in counts.items():
        share = count / total if total else 0
        if share < 0.1:
            print(f"Warning: cluster {cluster} share {share:.2%} < 10%")
    return counts


def dataframe_from_rows(rows: List[Dict]) -> pd.DataFrame:
    df = pd.DataFrame(rows)
    df["emb_x"] = df["emb_x"].astype("float32")
    df["emb_y"] = df["emb_y"].astype("float32")
    df["num_a"] = df["num_a"].astype("float32")
    df["num_b"] = df["num_b"].astype("float32")
    return df


def write_schema_json(path: Path) -> None:
    schema = {
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
        "num_b": "float32",
    }
    path.write_text(json.dumps(schema, indent=2))


def main() -> None:
    args = parse_args()
    rng = np.random.default_rng(args.seed)

    args.out_parquet.parent.mkdir(parents=True, exist_ok=True)
    args.out_csv.parent.mkdir(parents=True, exist_ok=True)
    if args.schema_json:
        args.schema_json.parent.mkdir(parents=True, exist_ok=True)

    locations = generate_locations(
        n_locations=args.n_locations,
        k_clusters=args.k_clusters,
        lat_range=(args.lat_min, args.lat_max),
        lon_range=(args.lon_min, args.lon_max),
        sigma=args.sigma,
        rng=rng,
    )

    cluster_counts = validate_clusters(locations)
    dates = spaced_dates(args.year, args.times)
    rows = generate_rows(locations, dates, rng)

    df = dataframe_from_rows(rows)

    df.to_parquet(args.out_parquet, index=False)
    if args.sample_size > 0:
        df.head(args.sample_size).to_csv(args.out_csv, index=False)

    if args.schema_json:
        write_schema_json(args.schema_json)

    print(f"Wrote {len(df)} rows to {args.out_parquet}")
    if args.sample_size > 0:
        written = min(len(df), args.sample_size)
        print(f"Sample ({written} rows) written to {args.out_csv}")
    print("Cluster distribution:")
    for cluster_idx, count in sorted(cluster_counts.items()):
        share = count / len(locations) if locations else 0
        print(f"  Cluster {cluster_idx}: {count} locations ({share:.1%})")
    print("Value ranges:")
    print(df[["num_a", "num_b"]].describe())


if __name__ == "__main__":
    main()
