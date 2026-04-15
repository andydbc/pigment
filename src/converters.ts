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

// ─── detectFormat ────────────────────────────────────────────────────────────

export function detectFormat(color: string): Format {
  const s = color.trim().toLowerCase();
  if (s.startsWith('#')) return 'hex';
  if (s.startsWith('rgba(') || s.startsWith('rgb(')) return 'rgb';
  if (s.startsWith('hsla(') || s.startsWith('hsl(')) return 'hsl';
  if (s.startsWith('vec3(') || s.startsWith('vec4(')) return 'glsl';
  if (s.startsWith('oklch(')) return 'oklch';
  if (s.startsWith('oklab(')) return 'oklab';
  if (s.startsWith('color(display-p3')) return 'p3';
  throw new Error(`Cannot detect format for: ${color}`);
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
      const result = deserialize(color);
      const srgb = colorConvert(
        result.coords as [number, number, number],
        OKLCH,
        sRGB,
      );
      return { values: Array.from(srgb), hasAlpha: false };
    }

    case 'oklab': {
      const result = deserialize(color);
      const srgb = colorConvert(
        result.coords as [number, number, number],
        OKLab,
        sRGB,
      );
      return { values: Array.from(srgb), hasAlpha: false };
    }

    case 'p3': {
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

  const converted: number[] = (() => {
    switch (to) {
      case 'hex':
      case 'rgb':
      case 'glsl':
        return Array.from(rgb3);
      case 'hsl':
        return Array.from(sRGBToHSL(rgb3[0], rgb3[1], rgb3[2]));
      case 'oklch':
        return Array.from(colorConvert(rgb3, sRGB, OKLCH));
      case 'oklab':
        return Array.from(colorConvert(rgb3, sRGB, OKLab));
      case 'p3':
        return Array.from(colorConvert(rgb3, sRGB, DisplayP3));
    }
  })();

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
      const L = c0.toFixed(4);
      const C = c1.toFixed(4);
      const H = c2.toFixed(2);
      if (hasAlpha && c3 !== undefined) return `oklch(${L} ${C} ${H} / ${c3.toFixed(3)})`;
      return `oklch(${L} ${C} ${H})`;
    }

    case 'oklab': {
      // @texel/color OKLab: [L, a, b] where L is 0–1
      const L = c0.toFixed(4);
      const a = c1.toFixed(4);
      const b = c2.toFixed(4);
      if (hasAlpha && c3 !== undefined) return `oklab(${L} ${a} ${b} / ${c3.toFixed(3)})`;
      return `oklab(${L} ${a} ${b})`;
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
