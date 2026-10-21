"use client";
import { useId, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import type { Profile, Visual } from "@/contracts/project";
import { hasControlChars, PROFILE_TEXT_LIMITS } from "@/data/project/parse";
import { projectStore } from "@/data/project/store";
import { Plate } from "@/components/plate/Plate";
import { SampleCard } from "@/components/samples/SampleCard";
import { PREVIEW_NEUTRALS, resolveForPlate } from "@/domain/tokens/resolve";
import { fontPairLabel } from "../visual/model";

type Field = "name" | "productType" | "notes";
const FIELDS: readonly Field[] = ["name", "productType", "notes"];
const LIMIT: Record<Field, number> = PROFILE_TEXT_LIMITS;

/** Trim, then check (CONTRACTS §1). Returns the error message, or null when valid. */
export function validate(field: Field, draft: string, saved: string | null): string | null {
  const v = draft.trim();
  const n = v.length;
  const over = n - LIMIT[field];
  if (field === "notes") return over > 0 ? `Notes are ${n} characters; the limit is 2000. Shorten them by ${over}. The saved notes haven’t changed.` : null;
  if (hasControlChars(v))
    return field === "name"
      ? "Keep the name on one line, without tabs. The saved name hasn’t changed."
      : "Keep the type on one line, without tabs. The saved type hasn’t changed.";
  if (field === "name") {
    if (n === 0)
      return saved === null
        ? "Enter a project name, 1 to 80 characters. Until you do, the name stays open."
        : `Enter a project name, 1 to 80 characters. Until you do, ${saved} stays saved.`;
    return over > 0 ? `This name is ${n} characters; the limit is 80. Shorten it by ${over}. The saved name hasn’t changed.` : null;
  }
  if (n === 0) return "Enter a product type, 1 to 60 characters, e.g. Clinic booking app.";
  return over > 0 ? `This is ${n} characters; the limit is 60. Shorten it by ${over}. The saved type hasn’t changed.` : null;
}

const stored = (p: Profile, f: Field): string | null => (f === "notes" ? p.notes : p[f]);

export function IdentityStop({ profile, visual, onDone }: { profile: Profile; visual: Visual; onDone: () => void }) {
  const uid = useId();
  const [drafts, setDrafts] = useState<Record<Field, string>>({ name: profile.name ?? "", productType: profile.productType ?? "", notes: profile.notes });
  const [synced, setSynced] = useState<Record<Field, string | null>>({ name: profile.name, productType: profile.productType, notes: profile.notes });
  const [edited, setEdited] = useState<Record<Field, boolean>>({ name: false, productType: false, notes: false });
  const [errors, setErrors] = useState<Record<Field, string | null>>({ name: null, productType: null, notes: null });
  const [focused, setFocused] = useState<Field | null>(null);

  // Drafts re-sync when the stored value changes while the field is not focused (hydration, opening a file).
  for (const f of FIELDS) {
    const s = stored(profile, f);
    if (s !== synced[f]) {
      setSynced((prev) => ({ ...prev, [f]: s }));
      if (focused !== f) setDrafts((prev) => ({ ...prev, [f]: s ?? "" }));
    }
  }

  const commit = (f: Field, value: string): string | null => {
    const error = validate(f, value, f === "notes" ? null : stored(profile, f));
    setErrors((prev) => ({ ...prev, [f]: error }));
    const v = value.trim();
    if (error === null && v !== stored(profile, f)) projectStore().setProfile(f, v);
    return error;
  };

  const onBlur = (f: Field) => () => {
    setFocused(null);
    if (edited[f]) commit(f, drafts[f]);
  };

  const onChange = (f: Field) => (value: string) => {
    setDrafts((prev) => ({ ...prev, [f]: value }));
    setEdited((prev) => ({ ...prev, [f]: true }));
    if (errors[f] !== null) setErrors((prev) => ({ ...prev, [f]: validate(f, value, f === "notes" ? null : stored(profile, f)) }));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const results = FIELDS.map((f) => commit(f, drafts[f]));
    setEdited({ name: true, productType: true, notes: true });
    const firstBad = FIELDS.find((_, i) => results[i] !== null);
    if (firstBad) document.getElementById(`${uid}-${firstBad}`)?.focus();
    else onDone();
  };

  const onKeyDown = (f: Field) => (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.currentTarget.blur();
      document.getElementById("stop-title")?.focus();
    } else if (f === "notes" && e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  };

  const controlClass =
    "min-h-11 w-full rounded-sm border border-dw-ctl bg-dw-surface px-3 py-2.5 text-body placeholder:text-dw-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dw-focus";
  const fieldProps = (f: Field) => ({
    id: `${uid}-${f}`,
    value: drafts[f],
    onFocus: () => setFocused(f),
    onBlur: onBlur(f),
    onKeyDown: onKeyDown(f),
    "aria-invalid": errors[f] !== null || undefined,
    "aria-describedby": `${uid}-${f}-msg`,
  });

  const fontPairId = visual.fontPair ?? PREVIEW_NEUTRALS.fontPair;
  const draftName = drafts.name.trim();

  return (
    <form noValidate onSubmit={onSubmit} aria-label="Name and product type" className="mt-5">
      <div className="grid grid-cols-1 gap-6 min-[761px]:grid-cols-[minmax(0,400px)_236px]">
        <div className="flex flex-col gap-5">
          <TextField uid={uid} field="name" label="Project name" draft={drafts.name} error={errors.name}>
            <input
              type="text"
              autoComplete="off"
              autoCapitalize="words"
              placeholder="e.g. Harbour"
              className={controlClass}
              {...fieldProps("name")}
              onChange={(e) => onChange("name")(e.target.value)}
            />
          </TextField>
          <TextField uid={uid} field="productType" label="Product type" draft={drafts.productType} error={errors.productType} hint="A few words for DESIGN.md. Nothing else depends on it.">
            <input
              type="text"
              autoComplete="off"
              placeholder="e.g. Clinic booking app"
              className={controlClass}
              {...fieldProps("productType")}
              onChange={(e) => onChange("productType")(e.target.value)}
            />
          </TextField>
          <TextField uid={uid} field="notes" label="Notes (optional)" draft={drafts.notes} error={errors.notes} hint="Goes into DESIGN.md as written. Can stay empty.">
            <textarea
              rows={4}
              placeholder="Audience, constraints, references: anything the team should know."
              className={`${controlClass} resize-y`}
              {...fieldProps("notes")}
              onChange={(e) => onChange("notes")(e.target.value)}
            />
          </TextField>
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <p className="font-mono text-label font-medium tracking-[0.08em] text-dw-text-muted uppercase">Name on the sample</p>
          <Plate
            tokens={resolveForPlate(visual, {})}
            fontPairId={fontPairId}
            fontLabel={fontPairLabel(fontPairId)}
            selected={false}
            tabbable={false}
            interactive={false}
            ariaLabel={`Name check: the sample header reads ${draftName === "" ? "Harbour" : draftName}`}
          >
            <SampleCard productName={draftName === "" ? null : draftName} />
          </Plate>
          <p className="text-small text-dw-text-muted">
            {draftName === ""
              ? "Shows Harbour, the sample’s stand-in, until you enter a name."
              : "Updates as you type. A name too long for the header is cut with an ellipsis."}
          </p>
        </div>
      </div>
      <div className="mt-5 flex flex-col items-start gap-3 border-t border-dw-line pt-4">
        <p className="max-w-[56ch] text-dw-text-muted">Each field saves when you leave it. You can change them later.</p>
        <button
          type="submit"
          className="inline-flex min-h-11 w-full items-center justify-center gap-2.5 rounded-sm bg-primary px-4 font-semibold whitespace-nowrap text-primary-foreground min-[761px]:w-auto"
        >
          Continue to platform
          <kbd className="border-primary-foreground bg-transparent text-primary-foreground">Enter</kbd>
        </button>
      </div>
    </form>
  );
}

function TextField({
  uid,
  field,
  label,
  draft,
  error,
  hint,
  children,
}: {
  uid: string;
  field: Field;
  label: string;
  draft: string;
  error: string | null;
  hint?: string;
  children: ReactNode;
}) {
  const limit = LIMIT[field];
  const n = draft.trim().length;
  const over = n - limit;
  return (
    <div className={`-ml-3 border-l-2 pl-2.5 ${error ? "border-l-dw-text" : "border-l-transparent"}`}>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <label htmlFor={`${uid}-${field}`} className="font-mono text-label font-medium tracking-[0.08em] uppercase">
          {label}
        </label>
        <span className={`font-mono text-label tabular-nums ${over > 0 ? "font-medium text-dw-text" : "text-dw-text-muted"}`}>
          {n} / {limit}
          {over > 0 ? ` · ${over} over` : ""}
        </span>
      </div>
      {children}
      <p id={`${uid}-${field}-msg`} aria-live="polite" className={`mt-1 text-small ${error ? "text-dw-text" : "text-dw-text-muted"}`}>
        {error ?? hint ?? ""}
      </p>
    </div>
  );
}
