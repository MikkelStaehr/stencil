"use client";
import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { LawEntry, LawParam } from "@/contracts/content";
import type { Principle, ProjectFile, Visual } from "@/contracts/project";
import { LAWS } from "@/content/laws";
import { projectStore, useProject } from "@/data/project/store";
import { lastDecidedStopBefore, nextStop, type StopId } from "@/domain/decisions";
import { parseParamInput } from "@/domain/parse-input";
import { countLine, formatParam, renderRule, ruleParts } from "@/domain/rules";
import { PREVIEW_NEUTRALS, resolveForPlate } from "@/domain/tokens/resolve";
import { Plate } from "@/components/plate/Plate";
import { DEMO_VALUES, LAW_DEMO_VARS } from "@/components/plate/demo-vars";
import { lawDemos, type LawDemo } from "@/components/samples/law-demos";
import { ownsKey } from "@/components/wizard/use-shortcuts";
import { fontPairLabel } from "@/components/wizard/steps/visual/model";

// Step 2 (design/specs/step-2-principles.md): one stop, one array. Every change commits at once.

const OPEN_VISUAL: Visual = { fontPair: null, spacingBase: null, radius: null, density: null, brandHex: null, paletteVariant: null, colorOverrides: {} };
/** The DO / DON'T plates always render in fixed neutrals, never the project's tokens. */
const NEUTRAL_TOKENS = resolveForPlate(OPEN_VISUAL, {});
const DEMO_FONT = PREVIEW_NEUTRALS.fontPair;
const LAW_DEMOS = lawDemos(DEMO_VALUES);

/** Session memory: the params last used per law, so unticking then re-ticking is a lossless undo. */
const memory = new Map<string, Record<string, number>>();
/** The file (store fileVersion) the session memory belongs to; another file starts with empty memory. */
let memoryFile: number | undefined;
const NO_MEMORY: ReadonlyMap<string, Record<string, number>> = new Map();
function writePrinciples(list: Principle[] | null) {
  projectStore().setPrinciples(list);
}

const suggested = (law: LawEntry) => Object.fromEntries(law.params.map((p) => [p.key, p.suggested]));
const fieldKey = (lawId: string, key: string) => `${lawId}.${key}`;
const checkboxId = (lawId: string) => `law-${lawId}`;
const fieldId = (k: string) => `param-${k.replace(".", "-")}`;
const focusId = (id: string) => document.getElementById(id)?.focus();

const STATUS = {
  open: "Nothing chosen yet. Tick the laws to check against, or decide on none.",
  chosen: "Each change saves as you make it. You can change them later.",
  none: "Decided: no UX rules. ux-rules.yaml exports an empty rules list.",
};


function paramsText(law: LawEntry, params: Record<string, number>): string {
  return law.params.map((p) => formatParam(params[p.key], p.unit)).join(", ");
}

export function PrinciplesStep({ project, onMove }: { project: ProjectFile; onMove: (id: StopId) => void }) {
  const principles = project.principles;
  const productName = project.profile.name;
  const whose = productName ? `${productName}’s` : "your project’s";
  const chosen = new Map((principles ?? []).map((p) => [p.lawId, p.params]));

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [note, setNote] = useState<string | null>(null);
  const [undoNone, setUndoNone] = useState(false);
  const [announce, setAnnounce] = useState<string | null>(null);
  const bar = useRef<HTMLDivElement>(null);
  // Another file (store fileVersion) means the session memory and unsaved drafts belong to the old
  // file, so an old draft never shows instead of the stored value.
  const { fileVersion } = useProject();
  const [fileSeen, setFileSeen] = useState(fileVersion);
  if (fileVersion !== fileSeen) {
    setFileSeen(fileVersion);
    setDrafts({});
    setErrors({});
  }
  const sessionMemory = fileVersion === memoryFile ? memory : NO_MEMORY;
  useEffect(() => {
    if (fileVersion === memoryFile) return;
    memory.clear();
    memoryFile = fileVersion;
  }, [fileVersion]);

  const paramsFor = (law: LawEntry) => chosen.get(law.id) ?? sessionMemory.get(law.id) ?? suggested(law);

  /** Writes the list in catalogue order; an empty list from ticking is never written (that is "open"). */
  function commit(next: Map<string, Record<string, number>>) {
    const list = LAWS.filter((l) => next.has(l.id)).map((l) => ({ lawId: l.id, params: next.get(l.id)! }));
    writePrinciples(list.length === 0 ? null : list);
    setUndoNone(false);
    setAnnounce(null);
  }

  function toggle(law: LawEntry) {
    const next = new Map(chosen);
    if (next.has(law.id)) {
      const params = next.get(law.id)!;
      memory.set(law.id, params);
      next.delete(law.id);
      setNote(law.params.length > 0 ? `Removed ${law.name}. Tick it again to restore ${paramsText(law, params)}.` : `Removed ${law.name}. Tick it again to restore it.`);
      const keys = law.params.map((p) => fieldKey(law.id, p.key));
      setDrafts((d) => Object.fromEntries(Object.entries(d).filter(([k]) => !keys.includes(k))));
      setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !keys.includes(k))));
    } else {
      next.set(law.id, paramsFor(law));
      setNote(null);
    }
    commit(next);
  }

  function errorFor(law: LawEntry, param: LawParam, raw: string): string | null {
    const r = parseParamInput(raw, param);
    if (r.ok) return null;
    const typed = raw.trim();
    const entered = /You entered/.test(r.message) || typed === "" ? "" : ` You entered ${typed}.`;
    return `${r.message}${entered} The rule still says ${formatParam(paramsFor(law)[param.key], param.unit)}.`;
  }

  function onInput(law: LawEntry, param: LawParam, raw: string) {
    const k = fieldKey(law.id, param.key);
    setDrafts((d) => ({ ...d, [k]: raw }));
    // Nothing is stored while typing: a value commits on blur, Enter or Esc (validate). After an error shows, re-validate on each input so it clears as soon as the value is valid.
    if (errors[k] !== undefined) setErrors((e) => withError(e, k, errorFor(law, param, raw)));
  }

  /** Blur, Enter and Esc: commit a valid value, or show the error and keep the stored one. True when valid. */
  function validate(law: LawEntry, param: LawParam): boolean {
    const k = fieldKey(law.id, param.key);
    const raw = drafts[k];
    if (raw === undefined) return true;
    const message = errorFor(law, param, raw);
    setErrors((e) => withError(e, k, message));
    const r = parseParamInput(raw, param);
    if (r.ok && r.value !== paramsFor(law)[param.key]) {
      const params = { ...paramsFor(law), [param.key]: r.value };
      memory.set(law.id, params);
      commit(new Map(chosen).set(law.id, params));
    }
    return message === null;
  }

  function onFieldKey(e: ReactKeyboardEvent<HTMLInputElement>, law: LawEntry, param: LawParam) {
    if (e.key !== "Enter" && e.key !== "Escape") return;
    e.preventDefault();
    if (validate(law, param)) focusId(checkboxId(law.id));
  }

  function onCheckboxKey(e: ReactKeyboardEvent<HTMLInputElement>, index: number) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const to = LAWS[index + (e.key === "ArrowDown" ? 1 : -1)];
    if (to) focusId(checkboxId(to.id));
  }

  const errorKeys = LAWS.flatMap((l) => l.params.map((p) => fieldKey(l.id, p.key))).filter((k) => errors[k] !== undefined);
  const n = principles?.length ?? 0;

  function primary() {
    if (principles === null) {
      focusId(checkboxId(LAWS[0].id));
      // Repeat the status sentence: clear, then set on the next frame so the live region speaks again.
      setAnnounce("");
      requestAnimationFrame(() => setAnnounce(STATUS.open));
      return;
    }
    if (errorKeys.length > 0) {
      focusId(fieldId(errorKeys[0]));
      return;
    }
    const to = nextStop("principles");
    if (to) onMove(to);
  }

  // Enter outside a field is the primary action (the kbd in the button promises it).
  const primaryRef = useRef(primary);
  useEffect(() => {
    primaryRef.current = primary;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.ctrlKey || e.metaKey || e.altKey) return;
      if (ownsKey(e.target, e.key)) return;
      e.preventDefault();
      primaryRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // The sticky bar never hides focus (WCAG 2.4.11): the page scroller pads by its height.
  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    const root = document.documentElement;
    const apply = () => (root.style.scrollPaddingBottom = `${el.offsetHeight + 8}px`);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.scrollPaddingBottom = "";
    };
  }, []);

  const errorNote =
    errorKeys.length === 0 ? "" : errorKeys.length === 1 ? " 1 field has an error; its rule keeps the saved value." : ` ${errorKeys.length} fields have errors; their rules keep the saved values.`;
  const baseStatus = principles === null ? STATUS.open : principles.length === 0 ? STATUS.none : (note ?? STATUS.chosen);
  const status = (announce ?? (principles === null && note ? note : baseStatus)) + errorNote;

  const sections = [
    { id: "tester", title: "Measured by tester", sub: "Tester measures each at 390 and 1280.", laws: LAWS.filter((l) => l.rule.check.kind !== "manual") },
    { id: "reviewer", title: "Answered by reviewer", sub: "Reviewer answers each question yes or no on the running app.", laws: LAWS.filter((l) => l.rule.check.kind === "manual") },
  ];

  return (
    <>
      <p className="font-mono text-label font-medium tracking-[0.08em] text-dw-text-muted uppercase">Step 02 · UX principles</p>
      <h1 id="stop-title" tabIndex={-1} className="mt-1.5 text-title font-semibold tracking-[-0.025em]">
        UX principles
      </h1>
      <p className="mt-1 max-w-[60ch] text-dw-text-muted">
        Pick the laws {whose} team will build and test against. Each becomes one rule in ux-rules.yaml; you can change them later.
      </p>
      <p className="sr-only">Which UX laws should {whose} team build and be tested against?</p>

      <div className="mt-6 flex flex-col gap-8">
        {sections.map((sec) => (
          <section key={sec.id} aria-labelledby={`laws-${sec.id}`}>
            <div className="flex items-baseline gap-2">
              <h2 id={`laws-${sec.id}`} className="text-body font-medium">
                {sec.title}
              </h2>
              <span className="font-mono text-label text-dw-text-muted tabular-nums">{sec.laws.length} LAWS</span>
            </div>
            <p className="text-small text-dw-text-muted">{sec.sub}</p>
            <ul className="@container mt-3 flex flex-col gap-3">
              {sec.laws.map((law) => (
                <LawCard
                  key={law.id}
                  law={law}
                  selected={chosen.has(law.id)}
                  params={paramsFor(law)}
                  drafts={drafts}
                  errors={errors}
                  onToggle={() => toggle(law)}
                  onCheckboxKey={(e) => onCheckboxKey(e, LAWS.indexOf(law))}
                  onInput={(p, raw) => onInput(law, p, raw)}
                  onBlur={(p) => void validate(law, p)}
                  onFieldKey={(e, p) => onFieldKey(e, law, p)}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          const to = lastDecidedStopBefore(project, "principles");
          if (to) onMove(to);
        }}
        className="mt-5 inline-flex min-h-11 items-center gap-2 text-small text-dw-text underline underline-offset-4"
      >
        Reopen the profile <kbd>E</kbd>
      </button>

      <div
        ref={bar}
        className="sticky bottom-0 z-20 -mx-4 mt-6 flex flex-col gap-3 border-t border-dw-line bg-dw-bg px-4 py-3 min-[761px]:-mx-6 min-[761px]:flex-row min-[761px]:items-center min-[761px]:justify-between min-[761px]:px-6"
      >
        <div className="min-w-0">
          <p className="font-mono text-label font-medium text-dw-text tabular-nums">{countLine(principles)}</p>
          <p role="status" className="text-small text-dw-text-muted">
            {status}
          </p>
        </div>
        <div className="flex flex-col gap-2 min-[761px]:shrink-0 min-[761px]:flex-row min-[761px]:items-center">
          {principles === null && (
            <button
              type="button"
              onClick={() => {
                writePrinciples([]);
                setNote(null);
                setAnnounce(null);
                setUndoNone(true);
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-sm border border-dw-ctl bg-dw-surface px-4 font-medium whitespace-nowrap"
            >
              Decide on no rules
            </button>
          )}
          {principles !== null && principles.length === 0 && undoNone && (
            <button
              type="button"
              onClick={() => {
                writePrinciples(null);
                setUndoNone(false);
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-sm border border-dw-ctl bg-dw-surface px-4 font-medium whitespace-nowrap"
            >
              Undo
            </button>
          )}
          <button
            type="button"
            data-primary-action=""
            aria-disabled={principles === null || undefined}
            onClick={primary}
            className={`inline-flex min-h-11 w-full items-center justify-center gap-2.5 rounded-sm px-4 font-semibold whitespace-nowrap min-[761px]:w-auto ${
              principles === null ? "border border-dw-ctl bg-dw-surface text-dw-text-muted" : "bg-primary text-primary-foreground"
            }`}
          >
            {principles === null ? "Choose at least one law" : n === 0 ? "Continue with no rules" : `Continue with ${n} ${n === 1 ? "rule" : "rules"}`}
            {principles !== null && <kbd className="border-primary-foreground bg-transparent text-primary-foreground">Enter</kbd>}
          </button>
        </div>
      </div>
    </>
  );
}

function withError(e: Record<string, string>, k: string, message: string | null): Record<string, string> {
  const next = { ...e };
  if (message === null) delete next[k];
  else next[k] = message;
  return next;
}

function RuleSentence({ law, params }: { law: LawEntry; params: Record<string, number> }) {
  // ruleParts is the same source renderRule joins, so textContent equals the exported rule line.
  const id = renderRule(law, params).id;
  return (
    <p className="text-body" data-rule-id={id}>
      {ruleParts(law, params).map((part, i) =>
        part.param ? (
          <strong key={i} className="font-semibold">
            {part.text}
          </strong>
        ) : (
          part.text
        ),
      )}
    </p>
  );
}

const LABEL = "font-mono text-label font-medium tracking-[0.08em] text-dw-text-muted uppercase";
const UNIT_SUFFIX: Record<LawParam["unit"], string> = { px: "px", ms: "ms", ratio: ":1", count: "" };

function LawCard(props: {
  law: LawEntry;
  selected: boolean;
  params: Record<string, number>;
  drafts: Record<string, string>;
  errors: Record<string, string>;
  onToggle: () => void;
  onCheckboxKey: (e: ReactKeyboardEvent<HTMLInputElement>) => void;
  onInput: (p: LawParam, raw: string) => void;
  onBlur: (p: LawParam) => void;
  onFieldKey: (e: ReactKeyboardEvent<HTMLInputElement>, p: LawParam) => void;
}) {
  const { law, selected, params } = props;
  const uid = useId();
  const must = law.rule.severity === "must";
  const check = law.rule.check;
  const demos = LAW_DEMOS[law.id];
  return (
    <li
      data-law={law.id}
      className={`grid grid-cols-1 rounded-xl border border-dw-line bg-dw-surface p-4 ${
        demos ? "@min-[640px]:grid-cols-[minmax(0,1fr)_312px] @min-[640px]:gap-5" : ""
      } ${
        selected ? "shadow-[inset_3px_0_0_var(--dw-text)]" : ""
      }`}
    >
      <div className="min-w-0">
        <label className="relative -mx-2 -mt-2 flex min-h-11 items-center gap-3 px-2">
          <input
            id={checkboxId(law.id)}
            type="checkbox"
            checked={selected}
            onChange={props.onToggle}
            onKeyDown={props.onCheckboxKey}
            aria-labelledby={`${uid}-name`}
            aria-describedby={`${uid}-severity ${uid}-summary`}
            className="absolute inset-0 z-10 m-0 size-full cursor-pointer appearance-none rounded-sm bg-transparent"
          />
          <span
            aria-hidden="true"
            className={`relative inline-flex size-[18px] shrink-0 items-center justify-center rounded-2xs border ${
              selected ? "border-dw-text bg-dw-text" : "border-dw-ctl bg-dw-surface"
            }`}
          >
            {selected && <span className="mb-[3px] block h-[10px] w-[5px] rotate-45 border-r-2 border-b-2 border-dw-bg" />}
          </span>
          <span id={`${uid}-name`} className="min-w-0 flex-1 font-semibold">
            {law.name}
          </span>
          <span
            id={`${uid}-severity`}
            className={`shrink-0 border px-1.5 py-0.5 font-mono text-label tracking-[0.08em] uppercase ${
              must ? "border-dw-text font-medium text-dw-text" : "border-dw-line text-dw-text-muted"
            }`}
          >
            {must ? "Must" : "Should"}
          </span>
        </label>

        <p id={`${uid}-summary`} className="mt-1 text-body text-dw-text">
          {law.summary}
        </p>
        <p className={`mt-3 ${LABEL}`}>When it applies</p>
        <p className="text-body">{law.when}</p>

        {selected &&
          law.params.map((p) => {
            const k = fieldKey(law.id, p.key);
            const error = props.errors[k];
            const id = fieldId(k);
            return (
              <div key={p.key} className={`mt-3 border-l-2 pl-2.5 ${error ? "border-l-dw-text" : "border-l-transparent"}`}>
                <label htmlFor={id} className={`${LABEL} text-dw-text`}>
                  {p.label}
                </label>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <input
                    id={id}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={props.drafts[k] ?? String(params[p.key])}
                    onChange={(e) => props.onInput(p, e.target.value)}
                    onBlur={() => props.onBlur(p)}
                    onKeyDown={(e) => props.onFieldKey(e, p)}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={`${id}-range${error ? ` ${id}-msg` : ""}`}
                    className="h-11 w-24 rounded-sm border border-dw-ctl bg-dw-bg px-3 text-body tabular-nums"
                  />
                  {UNIT_SUFFIX[p.unit] !== "" && <span className="font-mono text-label text-dw-text-muted">{UNIT_SUFFIX[p.unit]}</span>}
                  <span id={`${id}-range`} className="ml-2 font-mono text-label text-dw-text-muted tabular-nums">
                    Range {formatParam(p.min, p.unit)}–{formatParam(p.max, p.unit)}
                  </span>
                </div>
                {error && (
                  <p id={`${id}-msg`} className="mt-1 text-small text-dw-text">
                    {error}
                  </p>
                )}
              </div>
            );
          })}

        <p className={`mt-3 flex flex-wrap items-baseline gap-x-2 ${LABEL}`}>
          <span>{selected ? "Rule, as exported" : "Rule if added"}</span>
          <span className="tracking-normal normal-case">{`${law.id}.${law.rule.key}`}</span>
        </p>
        <RuleSentence law={law} params={params} />
        <p className={`mt-3 ${LABEL}`}>Check</p>
        {check.kind === "manual" ? (
          <p className="text-body">
            <span className="text-dw-text-muted">Reviewer answers yes or no: </span>
            {check.question}
          </p>
        ) : (
          <p className="font-mono text-label">
            {check.kind} · {check.viewports.join(", ")}
          </p>
        )}
      </div>

      {demos && (
        <div className="mt-3 grid grid-cols-2 gap-3 @min-[640px]:mt-0 @min-[640px]:grid-cols-[150px_150px]">
          <DemoFigure caption="DO" law={law} demo={demos.do} />
          <DemoFigure caption="DON’T" law={law} demo={demos.dont} />
        </div>
      )}
    </li>
  );
}

function DemoFigure({ caption, law, demo }: { caption: string; law: LawEntry; demo: LawDemo }) {
  return (
    <figure className="m-0 min-w-0">
      <figcaption className={`mb-1 ${LABEL}`}>{caption}</figcaption>
      <Plate
        tokens={NEUTRAL_TOKENS}
        fontPairId={DEMO_FONT}
        fontLabel={fontPairLabel(DEMO_FONT)}
        selected={false}
        tabbable={false}
        interactive={false}
        ariaLabel={`${caption === "DO" ? "Do" : "Don’t"}, ${law.name}${demo.meta ? `: ${demo.meta}` : ""}`}
      >
        <div style={LAW_DEMO_VARS}>{demo.node}</div>
      </Plate>
    </figure>
  );
}
