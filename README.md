# color-convert

CLI tool to convert colors between formats. Powered by [`@texel/color`](https://github.com/texel-org/color).

## Usage

```bash
node bin/convert-color.js --from <format> --to <format> --color <value>
```

## Supported Formats

| Format   | Example input                        | Example output                        |
|----------|--------------------------------------|---------------------------------------|
| `hex`    | `#ff6600` / `#ff660080`              | `#ff6600` / `#ff660080`               |
| `rgb`    | `rgb(255, 102, 0)`                   | `rgb(255, 102, 0)`                    |
| `hsl`    | `hsl(24, 100%, 50%)`                 | `hsl(24, 100%, 50%)`                  |
| `glsl`   | `vec3(1.0, 0.4, 0.0)`               | `vec3(1.000, 0.400, 0.000)`           |
| `oklch`  | `oklch(65% 0.196 41)`               | `oklch(69.58% 0.2043 43.49)`          |
| `oklab`  | `oklab(65% 0.1 0.1)`                | `oklab(65.00% 0.1000 0.1000)`         |
| `p3`     | `color(display-p3 1 0.4 0)`         | `color(display-p3 1.0000 0.4000 0.0000)` |

**GLSL:** outputs `vec3` when the source has no alpha channel, `vec4` when it does (e.g. 8-digit hex `#rrggbbaa`).

## Examples

```bash
# Hex to RGB
node bin/convert-color.js --from hex --to rgb --color "#ff6600"
# rgb(255, 102, 0)

# Hex to OKLCH
node bin/convert-color.js --from hex --to oklch --color "#ff6600"
# oklch(69.58% 0.2043 43.49)

# Hex to GLSL vec3
node bin/convert-color.js --from hex --to glsl --color "#ff6600"
# vec3(1.000, 0.400, 0.000)

# 8-digit hex to GLSL vec4 (with alpha)
node bin/convert-color.js --from hex --to glsl --color "#ff660080"
# vec4(1.000, 0.400, 0.000, 0.502)

# RGB to HSL
node bin/convert-color.js --from rgb --to hsl --color "rgb(255, 102, 0)"
# hsl(24, 100%, 50%)

# OKLCH to Display P3
node bin/convert-color.js --from oklch --to p3 --color "oklch(65% 0.196 41)"
# color(display-p3 0.8588 0.3860 0.1713)
```

## Flags

| Flag            | Alias | Description              |
|-----------------|-------|--------------------------|
| `--color`       | `-c`  | Input color value        |
| `--from`        | `-f`  | Input format (required)  |
| `--to`          | `-t`  | Output format (required) |
| `--help`        | `-h`  | Show help                |

## Build

```bash
yarn build
```

Outputs to `dist/index.js`.
