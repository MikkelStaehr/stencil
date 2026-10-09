// Project file v1 parser (docs/CONTRACTS.md §1): text → ProjectFile, or every problem at once.
// Never throws on bad input and never coerces ("8" is a type error).
import type { ParseError, ParseErrorCode } from "@/contracts/errors";
import {
  COLOR_ROLES, COMPONENT_LIBRARIES, DENSITIES, FONT_SIZE_KEYS, FORMAT, PALETTE_VARIANTS, PLATFORMS, SCHEMA_VERSION, SPACE_KEYS,
  type ColorRole, type FontRef, type Principle, type ProjectFile, type Resolved,
} from "@/contracts/project";
import { CHECK_KINDS, type Rule } from "@/contracts/rules";
import { FONT_PAIR_BY_ID } from "@/content/font-pairs";
import { FONT_BY_ID } from "@/content/fonts";
import { LAW_BY_ID } from "@/content/laws";
import { normalizeHex } from "@/domain/color/hex";
import { checkPairs } from "@/domain/color/pairs";
import { formatRatio } from "@/domain/color/contrast";
import { openDecisions } from "@/domain/decisions";
import { migrate } from "./migrate";

export type ParseResult = { ok: true; project: ProjectFile } | { ok: false; errors: ParseError[] };

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
/** Short, safe description of a bad value for messages: never echoes long text, never calls toString on objects. */
const describe = (v: unknown): string => {
  if (v === null) return "null";
  if (Array.isArray(v)) return "a list";
  if (typeof v === "object") return "an object";
  if (typeof v === "string") return v.length > 40 ? `text of ${v.length} characters` : JSON.stringify(v);
  return String(v);
};
/** Control characters (line breaks, tabs, U+007F–U+009F) are not allowed in single-line text. */
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;

/** Profile text limits (CONTRACTS §1). The profile form uses these, so it can never save what this parser rejects. */
export const PROFILE_TEXT_LIMITS = { name: 80, productType: 60, notes: 2000 } as const;
/** True if single-line text holds a line break, tab or other control character. */
export const hasControlChars = (s: string) => CONTROL.test(s);

class Collector {
  readonly errors: ParseError[] = [];
  add(path: string, code: ParseErrorCode, message: string) {
    this.errors.push({ path, code, message });
  }

  /** Reports missing documented keys (in order) via `each`, then unknown keys. Returns false if not an object. */
  object(path: string, value: unknown, keys: readonly string[], each: (key: string, v: unknown, p: string) => void, what: string): value is Obj {
    if (!isObj(value)) {
      this.add(path, "type", `${what} must be an object. Found ${describe(value)}.`);
      return false;
    }
    for (const key of keys) {
      const p = join(path, key);
      if (!(key in value)) this.add(p, "missing-key", `${p} is missing. Add it (use null if the decision is still open).`);
      else each(key, value[key], p);
    }
    for (const key of Object.keys(value)) {
      if (!keys.includes(key)) this.add(join(path, key), "unknown-key", `${join(path, key)} is not part of the format. Remove it or check the spelling.`);
    }
    return true;
  }

  /** Single-line, non-empty text unless `multiline` (only notes: may be empty and contain line breaks). */
  text(path: string, v: unknown, max: number, nullable: boolean, multiline = false): string | null | undefined {
    if (v === null && nullable) return null;
    if (typeof v !== "string") return void this.add(path, "type", `${path} must be text${nullable ? " or null if undecided" : ""}. Found ${describe(v)}.`);
    if (!multiline && v.trim() === "") return void this.add(path, "empty", `${path} is empty. Enter a value${nullable ? ", or use null if undecided" : ""}.`);
    if (v.length > max) return void this.add(path, "too-long", `${path} is ${v.length} characters; the limit is ${max}.`);
    if (!multiline && CONTROL.test(v)) return void this.add(path, "type", `${path} must be one line of text, without line breaks or tabs.`);
    return v;
  }

  oneOf<T extends string>(path: string, v: unknown, options: readonly T[], nullable: boolean): T | null | undefined {
    if (v === null && nullable) return null;
    if (typeof v === "string" && (options as readonly string[]).includes(v)) return v as T;
    this.add(path, "enum", `${path} must be one of ${options.map((o) => `"${o}"`).join(", ")}${nullable ? " or null" : ""}. Found ${describe(v)}.`);
    return undefined;
  }

  integer(path: string, v: unknown, min: number, max: number, nullable: boolean, unit = "px"): number | null | undefined {
    if (v === null && nullable) return null;
    const range = `a whole number of ${unit} from ${min} to ${max}${nullable ? ", or null if undecided" : ""}`;
    if (typeof v !== "number") return void this.add(path, "type", `${path} must be ${range}. Found ${describe(v)}.`);
    if (!Number.isInteger(v)) return void this.add(path, "not-integer", `${path} must be ${range}. Found ${v}.`);
    if (v < min || v > max) return void this.add(path, "range", `${path} must be ${range}. Found ${v}.`);
    return v;
  }

  number(path: string, v: unknown, min: number, max: number): number | undefined {
    if (typeof v !== "number") return void this.add(path, "type", `${path} must be a number from ${min} to ${max}. Found ${describe(v)}.`);
    if (v < min || v > max) return void this.add(path, "range", `${path} must be from ${min} to ${max}. Found ${v}.`);
    return v;
  }

  hex(path: string, v: unknown, nullable: boolean): string | null | undefined {
    if (v === null && nullable) return null;
    const hex = typeof v === "string" ? normalizeHex(v) : null;
    if (hex === null) this.add(path, "hex", `${path} must be a colour like #0F766E${nullable ? ", or null if undecided" : ""}. Found ${describe(v)}.`);
    return hex ?? undefined;
  }
}

const join = (path: string, key: string) => (path ? `${path}.${key}` : key);

function jsonSyntax(text: string, err: unknown): ParseError {
  const msg = err instanceof Error ? err.message : String(err);
  // V8 gives "(line L column C)" for most errors, "position N" for some, and nothing at the end of input.
  const lc = /line (\d+) column (\d+)/.exec(msg);
  const pos = /position (\d+)/.exec(msg);
  let where: string;
  if (lc) where = `line ${lc[1]}:${lc[2]}`;
  else {
    const before = text.slice(0, pos ? Number(pos[1]) : text.length).split("\n");
    where = `line ${before.length}:${before[before.length - 1].length + 1}`;
  }
  return { path: "", code: "json-syntax", message: `The file is not valid JSON (${where}). It may be cut off or edited by hand; open an earlier copy.` };
}

export function parse(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    return { ok: false, errors: [jsonSyntax(text, err)] };
  }
  if (!isObj(raw)) {
    return { ok: false, errors: [{ path: "", code: "not-object", message: "The file must contain one JSON object. Open a Stencil project file." }] };
  }
  if (raw.format !== FORMAT) {
    return { ok: false, errors: [{ path: "format", code: "format", message: `This is not a Stencil project file (format must be "${FORMAT}"). Open a .dwproj.json file.` }] };
  }
  const migrated = migrate(raw);
  if (!migrated.ok) return { ok: false, errors: [migrated.error] };

  const c = new Collector();
  const out: Partial<ProjectFile> = {};

  c.object("", migrated.value, ["schemaVersion", "format", "profile", "principles", "visual", "resolved"], (key, v, p) => {
    switch (key) {
      case "schemaVersion":
        out.schemaVersion = SCHEMA_VERSION; // checked by migrate()
        return;
      case "format":
        out.format = FORMAT; // checked above
        return;
      case "profile": {
        const prof: Partial<ProjectFile["profile"]> = {};
        c.object(p, v, ["name", "productType", "platform", "notes", "componentLibrary"], (k, val, pp) => {
          if (k === "name") prof.name = c.text(pp, val, PROFILE_TEXT_LIMITS.name, true) as string | null;
          if (k === "productType") prof.productType = c.text(pp, val, PROFILE_TEXT_LIMITS.productType, true) as string | null;
          if (k === "platform") prof.platform = c.oneOf(pp, val, PLATFORMS, true) as ProjectFile["profile"]["platform"];
          if (k === "notes") prof.notes = c.text(pp, val, PROFILE_TEXT_LIMITS.notes, false, true) as string;
          if (k === "componentLibrary") prof.componentLibrary = c.oneOf(pp, val, COMPONENT_LIBRARIES, false) as ProjectFile["profile"]["componentLibrary"];
        }, "profile");
        out.profile = prof as ProjectFile["profile"];
        return;
      }
      case "principles":
        out.principles = v === null ? null : parsePrinciples(c, p, v);
        return;
      case "visual": {
        const vis: Partial<ProjectFile["visual"]> = {};
        c.object(p, v, ["fontPair", "spacingBase", "radius", "density", "brandHex", "paletteVariant", "colorOverrides"], (k, val, pp) => {
          if (k === "fontPair") {
            if (val === null) vis.fontPair = null;
            else if (typeof val !== "string") c.add(pp, "type", `${pp} must be a font pair id or null. Found ${describe(val)}.`);
            else if (!FONT_PAIR_BY_ID.has(val)) c.add(pp, "unknown-id", `${pp} "${val}" is not in this version's font catalogue. Choose another font pair.`);
            else vis.fontPair = val;
          }
          if (k === "spacingBase") {
            vis.spacingBase = c.integer(pp, val, 2, 16, true) as number | null;
          }
          if (k === "radius") {
            vis.radius = c.integer(pp, val, 0, 32, true) as number | null;
          }
          if (k === "density") {
            vis.density = c.oneOf(pp, val, DENSITIES, true) as ProjectFile["visual"]["density"];
          }
          if (k === "brandHex") {
            vis.brandHex = c.hex(pp, val, true) as string | null;
          }
          if (k === "paletteVariant") {
            vis.paletteVariant = c.oneOf(pp, val, PALETTE_VARIANTS, true) as ProjectFile["visual"]["paletteVariant"];
          }
          if (k === "colorOverrides") {
            const overrides: Partial<Record<ColorRole, string>> = {};
            if (!isObj(val)) c.add(pp, "type", `${pp} must be an object ({} if there are none). Found ${describe(val)}.`);
            else
              for (const [role, hex] of Object.entries(val)) {
                if (!(COLOR_ROLES as readonly string[]).includes(role)) c.add(join(pp, role), "unknown-key", `${join(pp, role)} is not a colour role. Remove it.`);
                else {
                  const h = c.hex(join(pp, role), hex, false);
                  if (h) overrides[role as ColorRole] = h;
                }
              }
            vis.colorOverrides = overrides;
          }
        }, "visual");
        out.visual = vis as ProjectFile["visual"];
        return;
      }
      case "resolved":
        if (v === null) out.resolved = null;
        else if (openDecisions(out as ProjectFile).length > 0) c.add(p, "inconsistent", "resolved is filled in while a decision is still open. Set it to null, or decide every step first.");
        else out.resolved = parseResolved(c, p, v, out as ProjectFile);
        return;
    }
  }, "The file");

  if (c.errors.length > 0) return { ok: false, errors: c.errors };
  return { ok: true, project: out as ProjectFile };
}

function parsePrinciples(c: Collector, path: string, v: unknown): Principle[] | null {
  if (!Array.isArray(v)) {
    c.add(path, "type", `${path} must be a list of chosen laws ([] for none), or null if undecided. Found ${describe(v)}.`);
    return null;
  }
  const seen = new Set<string>();
  return v.map((item, i) => {
    const p = `${path}[${i}]`;
    const principle: Principle = { lawId: "", params: {} };
    c.object(p, item, ["lawId", "params"], (k, val, pp) => {
      if (k === "lawId") {
        if (typeof val !== "string") return c.add(pp, "type", `${pp} must be a law id. Found ${describe(val)}.`);
        if (seen.has(val)) c.add(pp, "duplicate", `${pp} "${val}" is chosen twice. Remove one.`);
        seen.add(val);
        if (!LAW_BY_ID.has(val)) c.add(pp, "unknown-id", `${pp} "${val}" is not a law in this version. Choose another law.`);
        principle.lawId = val;
      }
      if (k === "params") {
        const law = LAW_BY_ID.get(principle.lawId);
        if (!law) {
          if (!isObj(val)) c.add(pp, "type", `${pp} must be an object. Found ${describe(val)}.`);
          return;
        }
        c.object(pp, val, law.params.map((x) => x.key), (key, pv, ppp) => {
          const def = law.params.find((x) => x.key === key)!;
          const n = def.integer
            ? c.integer(ppp, pv, def.min, def.max, false, def.unit)
            : c.number(ppp, pv, def.min, def.max);
          if (typeof n === "number") principle.params[key] = n;
        }, pp);
      }
    }, p);
    return principle;
  });
}

function parseResolved(c: Collector, path: string, v: unknown, decided: ProjectFile): Resolved | null {
  const r: Partial<Resolved> = {};
  const pair = decided.visual?.fontPair ? FONT_PAIR_BY_ID.get(decided.visual.fontPair) : undefined;
  c.object(path, v, ["color", "font", "fontSize", "lineHeight", "space", "radius", "rules"], (key, val, p) => {
    if (key === "color") {
      c.object(p, val, ["light", "dark"], (k, cv, pp) => {
        if (k === "dark" && cv !== null) c.add(pp, "type", `${pp} must be null: v0.1 defines a light theme only.`);
        if (k === "light") {
          const light: Partial<Record<ColorRole, string>> = {};
          const ok = c.object(pp, cv, COLOR_ROLES, (role, hv, ppp) => {
            const h = c.hex(ppp, hv, false);
            if (h) light[role as ColorRole] = h;
          }, pp);
          if (ok && Object.keys(light).length === COLOR_ROLES.length) {
            for (const res of checkPairs(light as Record<ColorRole, string>)) {
              if (!res.pass) c.add(pp, "range", `${res.fg} / ${res.bg} is ${formatRatio(res.ratio)}:1; it needs at least ${res.min}:1. Pick another palette.`);
            }
          }
          r.color = { light: light as Record<ColorRole, string>, dark: null };
        }
      }, p);
    }
    if (key === "font") {
      const font: Partial<Resolved["font"]> = {};
      c.object(p, val, ["display", "text"], (role, fv, pp) => {
        const ref = parseFontRef(c, pp, fv);
        const expected = pair?.[role as "display" | "text"].font;
        if (ref && expected && ref.catalogueId !== expected) {
          c.add(join(pp, "catalogueId"), "inconsistent", `${pp}.catalogueId is "${ref.catalogueId}" but the chosen pair uses "${expected}". Recompute the snapshot.`);
        }
        if (ref) font[role as "display" | "text"] = ref;
      }, p);
      r.font = font as Resolved["font"];
    }
    if (key === "fontSize") {
      const sizes: Partial<Resolved["fontSize"]> = {};
      let prev = 0;
      c.object(p, val, FONT_SIZE_KEYS, (k, n, pp) => {
        const size = c.number(pp, n, 0.5, 6);
        if (size === undefined) return;
        if (size <= prev) c.add(pp, "range", `${pp} must be larger than the size before it. Found ${size}.`);
        prev = size;
        sizes[k as keyof Resolved["fontSize"]] = size;
      }, p);
      r.fontSize = sizes as Resolved["fontSize"];
    }
    if (key === "lineHeight") {
      const lh: Partial<Resolved["lineHeight"]> = {};
      c.object(p, val, ["text", "display"], (k, n, pp) => {
        const value = c.number(pp, n, 1, 2);
        if (value !== undefined) lh[k as "text" | "display"] = value;
      }, p);
      r.lineHeight = lh as Resolved["lineHeight"];
    }
    if (key === "space") {
      const space: Partial<Resolved["space"]> = {};
      c.object(p, val, SPACE_KEYS, (k, n, pp) => {
        const px = c.integer(pp, n, 2, 1024, false);
        if (typeof px !== "number") return;
        const base = decided.visual?.spacingBase;
        if (typeof base === "number" && px !== Number(k) * base) {
          c.add(pp, "inconsistent", `${pp} is ${px} but spacing base ${base} × ${k} is ${Number(k) * base}. Recompute the snapshot.`);
        }
        space[k as keyof Resolved["space"]] = px;
      }, p);
      r.space = space as Resolved["space"];
    }
    if (key === "radius") {
      const radius = c.integer(p, val, 0, 32, false);
      const chosen = decided.visual?.radius;
      // Only compare against a valid chosen radius; an invalid one is already reported under visual.radius.
      if (typeof radius === "number" && typeof chosen === "number" && radius !== chosen) {
        c.add(p, "inconsistent", `${p} is ${radius} but the chosen radius is ${chosen}. Recompute the snapshot.`);
      }
      if (typeof radius === "number") r.radius = radius;
    }
    if (key === "rules") r.rules = parseRules(c, p, val, Array.isArray(decided.principles) ? decided.principles : null);
  }, path);
  return r as Resolved;
}

function parseFontRef(c: Collector, path: string, v: unknown): FontRef | null {
  const ref: Partial<FontRef> = {};
  const ok = c.object(path, v, ["catalogueId", "family", "generic", "fontsource", "subset", "weights", "style", "license", "copyright"], (k, val, p) => {
    switch (k) {
      case "catalogueId":
        if (typeof val !== "string") c.add(p, "type", `${p} must be a font id. Found ${describe(val)}.`);
        else if (!FONT_BY_ID.has(val)) c.add(p, "unknown-id", `${p} "${val}" is not in this version's font catalogue.`);
        else ref.catalogueId = val;
        return;
      case "family":
      case "fontsource":
      case "copyright":
        ref[k] = c.text(p, val, 200, false) as string;
        return;
      case "generic":
        ref.generic = c.oneOf(p, val, ["sans-serif", "serif", "monospace"] as const, false) as FontRef["generic"];
        return;
      case "subset":
        ref.subset = c.oneOf(p, val, ["latin"] as const, false) as "latin";
        return;
      case "style":
        ref.style = c.oneOf(p, val, ["normal"] as const, false) as "normal";
        return;
      case "license":
        ref.license = c.oneOf(p, val, ["OFL-1.1"] as const, false) as "OFL-1.1";
        return;
      case "weights": {
        if (!Array.isArray(val) || val.length === 0) return c.add(p, "type", `${p} must be a non-empty list of weights. Found ${describe(val)}.`);
        const weights: number[] = [];
        val.forEach((w, i) => {
          const n = c.integer(`${p}[${i}]`, w, 100, 900, false, "weight units");
          if (typeof n !== "number") return;
          if (weights.length > 0 && n <= weights[weights.length - 1]) c.add(`${p}[${i}]`, "range", `${p} must be in ascending order without repeats.`);
          weights.push(n);
        });
        ref.weights = weights;
      }
    }
  }, path);
  return ok && ref.catalogueId ? (ref as FontRef) : null;
}

/** `principles` is null when the chosen laws are invalid (already reported); consistency is then not checked. */
function parseRules(c: Collector, path: string, v: unknown, principles: Principle[] | null): Rule[] {
  if (!Array.isArray(v)) {
    c.add(path, "type", `${path} must be a list. Found ${describe(v)}.`);
    return [];
  }
  if (principles && v.length !== principles.length) {
    c.add(path, "inconsistent", `${path} has ${v.length} rules but ${principles.length} laws are chosen. Recompute the snapshot.`);
  }
  return v.map((item, i) => {
    const p = `${path}[${i}]`;
    const rule: Partial<Rule> = {};
    const principle = principles?.[i];
    c.object(p, item, ["id", "law", "when", "rule", "severity", "check"], (k, val, pp) => {
      if (k === "id" || k === "when" || k === "rule") rule[k] = c.text(pp, val, 500, false) as string;
      if (k === "law") {
        if (typeof val !== "string") c.add(pp, "type", `${pp} must be a law id. Found ${describe(val)}.`);
        else if (principle && val !== principle.lawId) c.add(pp, "inconsistent", `${pp} is "${val}" but law ${i + 1} is "${principle.lawId}". Recompute the snapshot.`);
        else rule.law = val;
      }
      if (k === "severity") rule.severity = c.oneOf(pp, val, ["must", "should"] as const, false) as Rule["severity"];
      if (k === "check") rule.check = parseCheck(c, pp, val, principle) as Rule["check"];
    }, p);
    return rule as Rule;
  });
}

function parseCheck(c: Collector, path: string, v: unknown, principle: Principle | undefined): Rule["check"] | undefined {
  if (!isObj(v)) return void c.add(path, "type", `${path} must be an object. Found ${describe(v)}.`);
  const manual = v.kind === "manual";
  const keys = manual ? ["kind", "selector", "params", "viewports", "question"] : ["kind", "selector", "params", "viewports"];
  const check: Partial<Rule["check"]> = {};
  c.object(path, v, keys, (k, val, p) => {
    if (k === "kind") check.kind = c.oneOf(p, val, CHECK_KINDS, false) as Rule["check"]["kind"];
    if (k === "selector") {
      if (manual ? val !== null : typeof val !== "string" || val === "") c.add(p, "type", manual ? `${p} must be null for a manual check.` : `${p} must be a CSS selector.`);
      else check.selector = val as string | null;
    }
    if (k === "params") {
      if (!isObj(val) || Object.values(val).some((n) => typeof n !== "number")) c.add(p, "type", `${p} must map names to numbers.`);
      else {
        // Compared key by key (file key order is irrelevant); the stored copy takes the law's key order.
        const want = principle?.params;
        const same = want !== undefined && Object.keys(val).length === Object.keys(want).length && Object.entries(want).every(([key, n]) => val[key] === n);
        if (want !== undefined && !same) c.add(p, "inconsistent", `${p} differs from the chosen law's values. Recompute the snapshot.`);
        check.params = same ? { ...want } : (val as Record<string, number>);
      }
    }
    if (k === "viewports") {
      const ok =
        Array.isArray(val) &&
        val.every((n, i) => Number.isInteger(n) && n >= 320 && n <= 2560 && (i === 0 || n > val[i - 1])) &&
        (manual || val.length > 0);
      if (!ok) c.add(p, "range", `${p} must be ascending whole px from 320 to 2560${manual ? "" : ", at least one"}.`);
      else check.viewports = val as number[];
    }
    if (k === "question") check.question = c.text(p, val, 200, false) as string;
  }, path);
  return check as Rule["check"];
}
