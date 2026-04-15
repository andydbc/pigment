# color-convert CLI Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the color-convert CLI to use `@texel/color` for conversions, split logic into two focused files, add GLSL and CSS Color Level 4 format support, and make TypeScript build with zero errors.

**Architecture:** `src/converters.ts` holds all parse/convert/serialize logic — `parse()` always returns normalized sRGB 0–1 floats, `convertToSpace()` uses `@texel/color` to convert those sRGB values to the target color space, and `serialize()` formats the result as a string. `src/index.ts` is a thin yargs CLI that calls those three functions. HSL is not in `@texel/color` so it is implemented manually using the standard algorithm.

**Tech Stack:** TypeScript 5, `@texel/color` (color space math), `yargs` (CLI), `tsup` (bundler)

---

### Task 1: Install @texel/color

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add the dependency**

```bash
yarn add @texel/color
```

Expected: `package.json` and `yarn.lock` updated, `node_modules/@texel/color` exists.

- [ ] **Step 2: Verify the import works**

```bash
node --input-type=module <<'EOF'
import { convert, sRGB, OKLCH } from '@texel/color';
console.log(convert([1, 0, 0], sRGB, OKLCH));
EOF
```

Expected: prints something like `Float32Array [ 0.627..., 0.257..., 29.23... ]`

- [ ] **Step 3: Commit**

```bash
git add package.json yarn.lock
git commit -m "feat: add @texel/color dependency"
```

---

### Task 2: Create src/converters.ts

**Files:**
- Create: `src/converters.ts`

This file exports `Format`, `parse()`, `convertToSpace()`, and `serialize()`.

`parse()` always returns sRGB 0–1 floats. For oklch/oklab/p3 inputs, `deserialize()` + `convert()` from `@texel/color` converts them to sRGB. For hsl, a manual algorithm is used. For hex, rgb, glsl the values are already sRGB 0–1.

`convertToSpace()` takes those sRGB values and converts to the target color space using `@texel/color`. For hsl output a manual algorithm is used.

`serialize()` formats the converted values as a CSS string.

- [ ] **Step 1: Write src/converters.ts**

```ts
import {
  convert as colorConvert,
  deserialize,
  sRGB,
  OKLab,
  OKLCH,
  DisplayP3,
} from '@texel/color';

export const FORMATS = ['hex', 'rgb', 'hsl', 'glsl', 'oklch', 'oklab', 'p3'] as const;
export type Format = (typeof FORMATS)[number];

export interface Parsed {
  values: number[];
  hasAlpha: boolean;
}

// ─── HSL helpers (standard CSS algorithm) ────────────────────────────────────

function hslToSRGB(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l, l, l];
  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3)];
}

function sRGBToHSL(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

// ─── parse ───────────────────────────────────────────────────────────────────

export function parse(color: string, from: Format): Parsed {
  switch (from) {
    case 'hex': {
      const hex = color.replace(/^#/, '');
      const len = hex.length;
      if (len === 3) {
        return {
          values: [
            parseInt(hex[0] + hex[0], 16) / 255,
            parseInt(hex[1] + hex[1], 16) / 255,
            parseInt(hex[2] + hex[2], 16) / 255,
          ],
          hasAlpha: false,
        };
      }
      if (len === 4) {
        return {
          values: [
            parseInt(hex[0] + hex[0], 16) / 255,
            parseInt(hex[1] + hex[1], 16) / 255,
            parseInt(hex[2] + hex[2], 16) / 255,
            parseInt(hex[3] + hex[3], 16) / 255,
          ],
          hasAlpha: true,
        };
      }
      if (len === 6) {
        return {
          values: [
            parseInt(hex.slice(0, 2), 16) / 255,
            parseInt(hex.slice(2, 4), 16) / 255,
            parseInt(hex.slice(4, 6), 16) / 255,
          ],
          hasAlpha: false,
        };
      }
      if (len === 8) {
        return {
          values: [
            parseInt(hex.slice(0, 2), 16) / 255,
            parseInt(hex.slice(2, 4), 16) / 255,
            parseInt(hex.slice(4, 6), 16) / 255,
            parseInt(hex.slice(6, 8), 16) / 255,
          ],
          hasAlpha: true,
        };
      }
      throw new Error(`Invalid hex color: ${color}`);
    }

    case 'rgb': {
      const m = color.match(/rgba?\(\s*([^)]+)\)/i);
      if (!m) throw new Error(`Invalid rgb color: ${color}`);
      const parts = m[1].split(',').map((s) => s.trim());
      const r = parseInt(parts[0]) / 255;
      const g = parseInt(parts[1]) / 255;
      const b = parseInt(parts[2]) / 255;
      if (parts.length === 4) {
        return { values: [r, g, b, parseFloat(parts[3])], hasAlpha: true };
      }
      return { values: [r, g, b], hasAlpha: false };
    }

    case 'hsl': {
      const m = color.match(/hsla?\(\s*([^)]+)\)/i);
      if (!m) throw new Error(`Invalid hsl color: ${color}`);
      const parts = m[1].split(',').map((s) => s.trim());
      const h = parseFloat(parts[0]) / 360;
      const s = parseFloat(parts[1]) / 100;
      const l = parseFloat(parts[2]) / 100;
      const rgb = hslToSRGB(h, s, l);
      if (parts.length === 4) {
        return { values: [...rgb, parseFloat(parts[3])], hasAlpha: true };
      }
      return { values: rgb, hasAlpha: false };
    }

    case 'glsl': {
      const m = color.match(/vec([34])\(\s*([^)]+)\)/);
      if (!m) throw new Error(`Invalid glsl color: ${color}`);
      const isVec4 = m[1] === '4';
      const components = m[2].split(',').map((s) => parseFloat(s.trim()));
      return { values: components, hasAlpha: isVec4 };
    }

    case 'oklch': {
      // expects: oklch(L% C H) or oklch(L% C H / alpha)
      const result = deserialize(color);
      const srgb = colorConvert(
        result.coords as [number, number, number],
        OKLCH,
        sRGB,
      );
      return { values: Array.from(srgb), hasAlpha: false };
    }

    case 'oklab': {
      // expects: oklab(L% a b) or oklab(L% a b / alpha)
      const result = deserialize(color);
      const srgb = colorConvert(
        result.coords as [number, number, number],
        OKLab,
        sRGB,
      );
      return { values: Array.from(srgb), hasAlpha: false };
    }

    case 'p3': {
      // expects: color(display-p3 r g b)
      const result = deserialize(color);
      const srgb = colorConvert(
        result.coords as [number, number, number],
        DisplayP3,
        sRGB,
      );
      return { values: Array.from(srgb), hasAlpha: false };
    }
  }
}

// ─── convertToSpace ──────────────────────────────────────────────────────────

export function convertToSpace(srgbValues: number[], to: Format): number[] {
  const alpha = srgbValues.length === 4 ? srgbValues[3] : undefined;
  const rgb3: [number, number, number] = [srgbValues[0], srgbValues[1], srgbValues[2]];

  let converted: number[];

  switch (to) {
    case 'hex':
    case 'rgb':
    case 'glsl':
      converted = Array.from(rgb3);
      break;
    case 'hsl':
      converted = Array.from(sRGBToHSL(rgb3[0], rgb3[1], rgb3[2]));
      break;
    case 'oklch':
      converted = Array.from(colorConvert(rgb3, sRGB, OKLCH));
      break;
    case 'oklab':
      converted = Array.from(colorConvert(rgb3, sRGB, OKLab));
      break;
    case 'p3':
      converted = Array.from(colorConvert(rgb3, sRGB, DisplayP3));
      break;
  }

  if (alpha !== undefined) converted.push(alpha);
  return converted;
}

// ─── serialize ───────────────────────────────────────────────────────────────

export function serialize(values: number[], to: Format, hasAlpha: boolean): string {
  const [c0, c1, c2, c3] = values;

  switch (to) {
    case 'hex': {
      const r = Math.round(c0 * 255).toString(16).padStart(2, '0');
      const g = Math.round(c1 * 255).toString(16).padStart(2, '0');
      const b = Math.round(c2 * 255).toString(16).padStart(2, '0');
      if (hasAlpha && c3 !== undefined) {
        const a = Math.round(c3 * 255).toString(16).padStart(2, '0');
        return `#${r}${g}${b}${a}`;
      }
      return `#${r}${g}${b}`;
    }

    case 'rgb': {
      const r = Math.round(c0 * 255);
      const g = Math.round(c1 * 255);
      const b = Math.round(c2 * 255);
      if (hasAlpha && c3 !== undefined) return `rgba(${r}, ${g}, ${b}, ${c3.toFixed(3)})`;
      return `rgb(${r}, ${g}, ${b})`;
    }

    case 'hsl': {
      // values are [h, s, l] in 0–1 range
      const h = Math.round(c0 * 360);
      const s = Math.round(c1 * 100);
      const l = Math.round(c2 * 100);
      if (hasAlpha && c3 !== undefined) return `hsla(${h}, ${s}%, ${l}%, ${c3.toFixed(3)})`;
      return `hsl(${h}, ${s}%, ${l}%)`;
    }

    case 'glsl': {
      const r = c0.toFixed(3);
      const g = c1.toFixed(3);
      const b = c2.toFixed(3);
      if (hasAlpha && c3 !== undefined) return `vec4(${r}, ${g}, ${b}, ${c3.toFixed(3)})`;
      return `vec3(${r}, ${g}, ${b})`;
    }

    case 'oklch': {
      // @texel/color OKLCH: [L, C, H] where L is 0–1
      const L = (c0 * 100).toFixed(2);
      const C = c1.toFixed(4);
      const H = c2.toFixed(2);
      if (hasAlpha && c3 !== undefined) return `oklch(${L}% ${C} ${H} / ${c3.toFixed(3)})`;
      return `oklch(${L}% ${C} ${H})`;
    }

    case 'oklab': {
      // @texel/color OKLab: [L, a, b] where L is 0–1
      const L = (c0 * 100).toFixed(2);
      const a = c1.toFixed(4);
      const b = c2.toFixed(4);
      if (hasAlpha && c3 !== undefined) return `oklab(${L}% ${a} ${b} / ${c3.toFixed(3)})`;
      return `oklab(${L}% ${a} ${b})`;
    }

    case 'p3': {
      const r = c0.toFixed(4);
      const g = c1.toFixed(4);
      const b = c2.toFixed(4);
      if (hasAlpha && c3 !== undefined) return `color(display-p3 ${r} ${g} ${b} / ${c3.toFixed(3)})`;
      return `color(display-p3 ${r} ${g} ${b})`;
    }
  }
}
```

- [ ] **Step 2: Type-check converters.ts in isolation**

```bash
npx tsc --noEmit
```

Expected: zero errors. If `@texel/color` types are missing, run `yarn add -D @types/texel__color` (check if they exist) — if not, the package ships its own types and no `@types` package is needed.

- [ ] **Step 3: Commit**

```bash
git add src/converters.ts
git commit -m "feat: add converters.ts with parse/convertToSpace/serialize"
```

---

### Task 3: Rewrite src/index.ts

**Files:**
- Modify: `src/index.ts`

Remove all conversion logic. This file only wires yargs and calls the three functions from `converters.ts`.

- [ ] **Step 1: Replace src/index.ts**

```ts
import yargs from 'yargs';
import { FORMATS, Format, parse, convertToSpace, serialize } from './converters.js';

const argv = await yargs(process.argv.slice(2))
  .option('color', {
    alias: 'c',
    type: 'string',
    description: 'Input color value',
    demandOption: true,
  })
  .option('from', {
    alias: 'f',
    type: 'string',
    description: 'Input format',
    choices: FORMATS,
    demandOption: true,
  })
  .option('to', {
    alias: 't',
    type: 'string',
    description: 'Output format',
    choices: FORMATS,
    demandOption: true,
  })
  .help()
  .alias('help', 'h')
  .parseAsync();

try {
  const { values, hasAlpha } = parse(argv.color, argv.from as Format);
  const converted = convertToSpace(values, argv.to as Format);
  const output = serialize(converted, argv.to as Format, hasAlpha);
  console.log(output);
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: rewrite index.ts as thin CLI wrapper"
```

---

### Task 4: Create bin/convert-color.js

**Files:**
- Create: `bin/convert-color.js`

The `package.json` `bin` field points to this file. It must have a Node shebang and dynamically import the built output.

- [ ] **Step 1: Create bin/convert-color.js**

```js
#!/usr/bin/env node
import('../dist/index.js');
```

- [ ] **Step 2: Make it executable**

```bash
chmod +x bin/convert-color.js
```

- [ ] **Step 3: Commit**

```bash
git add bin/convert-color.js
git commit -m "feat: add bin/convert-color.js shebang wrapper"
```

---

### Task 5: Build and smoke test

**Files:** none new — verify everything works end-to-end.

- [ ] **Step 1: Full build**

```bash
yarn build
```

Expected: `tsc --noemit` passes with zero errors, then tsup produces `dist/index.js` with no warnings.

- [ ] **Step 2: Smoke test hex → rgb**

```bash
node bin/convert-color.js --from hex --to rgb --color "#ff6600"
```

Expected: `rgb(255, 102, 0)`

- [ ] **Step 3: Smoke test hex → oklch**

```bash
node bin/convert-color.js --from hex --to oklch --color "#ff6600"
```

Expected: something like `oklch(65.73% 0.1960 40.85)`

- [ ] **Step 4: Smoke test hex → glsl (no alpha)**

```bash
node bin/convert-color.js --from hex --to glsl --color "#ff6600"
```

Expected: `vec3(1.000, 0.400, 0.000)`

- [ ] **Step 5: Smoke test 8-digit hex → glsl (with alpha)**

```bash
node bin/convert-color.js --from hex --to glsl --color "#ff660080"
```

Expected: `vec4(1.000, 0.400, 0.000, 0.502)`

- [ ] **Step 6: Smoke test rgb → hsl**

```bash
node bin/convert-color.js --from rgb --to hsl --color "rgb(255, 102, 0)"
```

Expected: `hsl(24, 100%, 50%)`

- [ ] **Step 7: Smoke test oklch → p3**

```bash
node bin/convert-color.js --from oklch --to p3 --color "oklch(65% 0.196 41)"
```

Expected: `color(display-p3 ...)` with four decimal values.

- [ ] **Step 8: Smoke test --help**

```bash
node bin/convert-color.js --help
```

Expected: usage text listing `--color`, `--from`, `--to` with their choices.

- [ ] **Step 9: Final commit**

```bash
git add -A
git commit -m "chore: verify build and smoke tests pass"
```
