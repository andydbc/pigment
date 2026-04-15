# color-convert CLI Refactor Design

**Date:** 2026-04-15

## Overview

Refactor the `color-convert` CLI tool to use `@texel-org/color` for color space conversions, add GLSL output support, expose richer color spaces (oklch, oklab, p3), and restructure the codebase into two focused files.

---

## File Structure

```
src/
  converters.ts   — all parse, serialize, and conversion logic
  index.ts        — CLI wiring only (yargs, calls converters)
bin/
  convert-color.js — shebang wrapper pointing at built output
```

---

## Supported Formats

Format names used in both `--from` and `--to` flags:

| Name    | Description                          |
|---------|--------------------------------------|
| `hex`   | CSS hex — `#rgb`, `#rrggbb`, `#rrggbbaa` |
| `rgb`   | CSS rgb — `rgb(255, 102, 0)`         |
| `hsl`   | CSS hsl — `hsl(24, 100%, 50%)`       |
| `glsl`  | GLSL vector — `vec3(...)` or `vec4(...)` |
| `oklch` | CSS Color L4 — `oklch(70% 0.15 30)`  |
| `oklab` | CSS Color L4 — `oklab(70% 0.1 0.1)` |
| `p3`    | CSS Color L4 — `color(display-p3 1 0.4 0)` |

---

## CLI Interface

Both `--from` and `--to` are required. Format is always declared explicitly — no auto-detection.

```bash
convert-color --from hex   --to oklch --color "#ff6600"
convert-color --from glsl  --to hex   --color "vec3(1.0, 0.4, 0.0)"
convert-color --from rgb   --to glsl  --color "rgb(255, 102, 0)"
convert-color --from oklch --to p3    --color "oklch(70% 0.15 30)"
```

Flags:
- `--color` / `-c` — input color string (required)
- `--from` / `-f` — input format (required, one of the supported formats)
- `--to` / `-t` — output format (required, one of the supported formats)
- `--help` / `-h`

---

## Conversion Pipeline

All conversions flow through a normalized float array pivot:

```
parse(color, from) → number[]        (0–1 floats, length 3 or 4)
        ↓
convert(values, from, to)            via @texel-org/color
        ↓
serialize(values, to, hasAlpha) → string
```

### `converters.ts` exports

```ts
type Format = 'hex' | 'rgb' | 'hsl' | 'glsl' | 'oklch' | 'oklab' | 'p3';

function parse(color: string, from: Format): number[]
function convert(values: number[], from: Format, to: Format): number[]
function serialize(values: number[], to: Format, hasAlpha: boolean): string
```

### Output string formats

| Format  | Example output                      | Notes                              |
|---------|-------------------------------------|------------------------------------|
| `hex`   | `#ff6600` / `#ff6600ff`             | lowercase, alpha only when present |
| `rgb`   | `rgb(255, 102, 0)`                  | integer 0–255                      |
| `hsl`   | `hsl(24, 100%, 50%)`                | integer degrees and percentages    |
| `glsl`  | `vec3(1.0, 0.400, 0.000)` / `vec4(...)` | 3 decimal places, vec4 when `hasAlpha` |
| `oklch` | `oklch(70% 0.15 30)`                | CSS Color Level 4                  |
| `oklab` | `oklab(70% 0.10 0.10)`              | CSS Color Level 4                  |
| `p3`    | `color(display-p3 1.000 0.400 0.000)` | CSS Color Level 4                |

### GLSL alpha rule

- `vec3` is used when the source color has no alpha (e.g. `#rrggbb`, `rgb(...)`)
- `vec4` is used when the source color carries an alpha channel (e.g. `#rrggbbaa`)
- `hasAlpha` is derived during `parse()` and threaded through to `serialize()`

---

## Dependencies

- Add `@texel-org/color` as a production dependency
- Existing: `yargs`, `tsup`, `typescript`

---

## Build

- `tsc --noemit` must pass with zero errors
- `tsup ./src/index.ts` produces the output consumed by `bin/convert-color.js`
- `bin/convert-color.js` must have a Node shebang and be executable
