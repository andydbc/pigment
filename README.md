# pigment

![banner](./media/banner.png)

CLI tool to convert colors between colorspaces & formats.

## Install

```bash
npm install -g @andbc/pigment
```

## Usage

```bash
pigment <color> --to <format> [--from <format>]
```

## Supported Formats

| Format   | Example input                        | Example output                           |
|----------|--------------------------------------|------------------------------------------|
| `hex`    | `#ff6600` / `#ff660080`              | `#ff6600` / `#ff660080`                  |
| `rgb`    | `rgb(255, 102, 0)`                 | `rgb(255, 102, 0)`                     |
| `hsl`    | `hsl(24, 100%, 50%)`               | `hsl(24, 100%, 50%)`                   |
| `glsl`   | `vec3(1.0, 0.4, 0.0)`                | `vec3(1.000, 0.400, 0.000)`              |
| `oklch`  | `oklch(65% 0.196 41)`                | `oklch(69.58% 0.2043 43.49)`             |
| `oklab`  | `oklab(65% 0.1 0.1)`                 | `oklab(65.00% 0.1000 0.1000)`            |
| `p3`     | `color(display-p3 1 0.4 0)`          | `color(display-p3 1.0000 0.4000 0.0000)` |

**GLSL:** outputs `vec3` when the source has no alpha channel, `vec4` when it does (e.g. 8-digit hex `#rrggbbaa`).

## Examples

```bash
# Hex to RGB (format auto-detected)
pigment "#ff6600" --to rgb
# rgb(255, 102, 0)

# Hex to OKLCH (format auto-detected)
pigment "#ff6600" --to oklch
# oklch(0.6958 0.2043 43.49)

# 8-digit hex to GLSL vec4 (with alpha, format auto-detected)
pigment "#ff660080" --to glsl
# vec4(1.000, 0.400, 0.000, 0.502)

# RGB to HSL (explicit --from)
pigment "rgb(255, 102, 0)" --from rgb --to hsl
# hsl(24, 100%, 50%)

# OKLCH to Display P3 (explicit --from)
pigment "oklch(0.65 0.196 41)" --from oklch --to p3
# color(display-p3 0.8588 0.3860 0.1713)

# GLSL to hex (explicit --from)
pigment "vec3(1.0, 0.4, 0.0)" --from glsl --to hex
# #ff6600
```

## Flags

| Flag     | Alias | Description                             |
|----------|-------|-----------------------------------------|
| `--from` | `-f`  | Input format (auto-detected if omitted) |
| `--to`   | `-t`  | Output format (required)                |
| `--help` | `-h`  | Show help                               |

## Build

```bash
yarn build
```

Outputs to `dist/index.js`.

## Credits

Color space conversions by [`@texel/color`](https://github.com/texel-org/color).

## License

MIT, see [LICENSE](https://github.com/andydbc/pigment/blob/main/LICENSE) for details.
