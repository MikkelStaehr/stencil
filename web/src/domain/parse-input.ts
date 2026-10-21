// Form input is not file input (docs/CONTRACTS.md §1): people type "8", "8px", "8,0" or "0f766e".
// Returns the value, or a message to show next to the field. Junk is never coerced into a value.
import type { LawParam } from "@/contracts/content";
import type { Hex } from "@/contracts/project";
import { formatParam } from "./rules";

export type InputResult<T> = { ok: true; value: T } | { ok: false; message: string };

export function parseHexInput(raw: string): InputResult<Hex> {
  const s = raw.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{6}$/.test(s)) return { ok: true, value: `#${s.toUpperCase()}` };
  if (/^[0-9a-fA-F]{3}$/.test(s)) return { ok: true, value: `#${[...s].map((c) => c + c).join("").toUpperCase()}` };
  return { ok: false, message: "Enter a colour as 6 hex digits, like #0F766E." };
}

/** A number with an optional unit, dot or comma decimals. `integer` rejects fractions instead of rounding. */
export function parseNumberInput(raw: string, opts: { min: number; max: number; integer: boolean; unit?: string }): InputResult<number> {
  const unit = opts.unit ? `(?:\\s*${opts.unit})?` : "";
  const m = new RegExp(`^\\s*(-?\\d+(?:[.,]\\d+)?)${unit}\\s*$`, "i").exec(raw);
  const range = `${opts.min}–${opts.max}${opts.unit ? ` ${opts.unit}` : ""}`;
  if (!m) return { ok: false, message: `Enter a number from ${range}.` };
  const value = Number(m[1].replace(",", "."));
  if (opts.integer && !Number.isInteger(value)) return { ok: false, message: `Enter a whole number from ${range}.` };
  if (value < opts.min || value > opts.max) return { ok: false, message: `Enter a number from ${range}. You entered ${m[1]}.` };
  return { ok: true, value: value + 0 }; // + 0 turns "-0" into 0
}

/** A law param as typed: "44", "44px", "4,5", "4.5:1", "400 ms". Messages give the range in the param's own units. */
export function parseParamInput(raw: string, param: LawParam): InputResult<number> {
  const suffix = param.unit === "px" ? "(?:\\s*px)?" : param.unit === "ms" ? "(?:\\s*ms)?" : param.unit === "ratio" ? "(?:\\s*:\\s*1)?" : "";
  const m = new RegExp(`^\\s*(-?\\d+(?:[.,]\\d+)?)${suffix}\\s*$`, "i").exec(raw);
  const range = `from ${formatParam(param.min, param.unit)} to ${formatParam(param.max, param.unit)}`;
  const kind = param.integer ? "a whole number" : "a number";
  if (m && /[.,]\d{3,}/.test(m[1])) return { ok: false, message: `Enter ${kind} ${range}, with at most 2 decimals.` };
  if (!m) return { ok: false, message: `Enter ${kind} ${range}.` };
  const value = Number(m[1].replace(",", "."));
  if (param.integer && !Number.isInteger(value)) return { ok: false, message: `Enter a whole number ${range}.` };
  if (value < param.min || value > param.max) return { ok: false, message: `Enter ${kind} ${range}. You entered ${formatParam(value, param.unit)}.` };
  return { ok: true, value: value + 0 }; // + 0 turns "-0" into 0
}
