# Black Hills MCP — Frontend Prototype

Retro NASA-inspired control deck for exploring the dummy telemetry cloud.

## Getting Started

```bash
cd frontend
npm install
npm run dev
```

The dev server will serve `public/sample.csv` generated from `scripts/generate_dummy_points.py`. Regenerate data in the project root and copy a fresh sample if needed:

```bash
python ../scripts/generate_dummy_points.py --out_csv ../data/dummy_points.sample.csv
cp ../data/dummy_points.sample.csv public/sample.csv
```

For the full 5k-point experience, include the sample flag:

```bash
python ../scripts/generate_dummy_points.py --sample_size 5000 --out_csv ../data/dummy_points.sample.csv
cp ../data/dummy_points.sample.csv public/sample.csv
```

## Features

- Full-screen scatter plot (no frame) that morphs between embedding and geographic layouts.
- Simple NASA-punk styling: noise overlay, neon palette, and lightweight overlay stats.
- Mission console chatbox docked to the bottom edge, logging prompts/responses to mimic MCP intent parsing.
- Layout toggle and coverage stats float above the points; natural-language filters will take over as MCP tooling arrives.
