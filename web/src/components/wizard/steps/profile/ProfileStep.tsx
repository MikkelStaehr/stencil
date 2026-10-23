"use client";
import type { ColorRole, ComponentLibrary, Platform, ProjectFile } from "@/contracts/project";
import { projectStore } from "@/data/project/store";
import { SHADCN_ROWS } from "@/export/shadcn-map";
import { PREVIEW_NEUTRALS, resolveForPlate } from "@/domain/tokens/resolve";
import { PlateGrid } from "@/components/plate/PlateGrid";
import { PlatformStage } from "@/components/samples/PlatformStage";
import { nextStop, type StopId } from "@/domain/decisions";
import { fontPairLabel } from "../visual/model";
import { IdentityStop } from "./identity";
import { LIBRARY_LABELS, PLATFORM_LABELS, type ProfileStop } from "./model";

const META: Record<ProfileStop, { index: number; title: string; lead: (whose: string) => string }> = {
  "profile.identity": {
    index: 1,
    title: "Name and product type",
    lead: () => "Name the project and say what kind of product it is. Both go into DESIGN.md; you can change them later.",
  },
  "profile.platform": {
    index: 2,
    title: "Platform",
    lead: (whose) =>
      `Which screens do ${whose} designs target first? This sets the platform line in DESIGN.md and the width the team designs at. It changes no tokens; you can change it later.`,
  },
  "profile.library": {
    index: 3,
    title: "Component library",
    lead: (whose) => `How should DESIGN.md name ${whose} CSS variables? The colours and tokens.json stay the same; you can change this later.`,
  },
};

const PLATFORM_DESCRIPTIONS: Record<Platform, string> = {
  desktop: "Designed at 1280 × 800; must still work at 390.",
  mobile: "Designed at 390 × 844; grows to fit wider screens.",
  both: "Designed and reviewed at 390 and 1280 equally.",
};

const LIBRARY_DESCRIPTIONS: Record<ComponentLibrary, string> = {
  shadcn: "Maps your colours to shadcn’s variables. Its --accent is the hover colour, not your brand.",
  none: "Declares your own role names, for Tailwind or plain CSS without shadcn.",
};

/** The Profile lab's stops, one view each. Choosing moves on along the path, so the pre-selected library is seen once. */
export function ProfileStep({ stop, project, onMove }: { stop: ProfileStop; project: ProjectFile; onMove: (id: StopId) => void }) {
  const goOn = () => {
    const next = nextStop(stop);
    if (next) onMove(next);
  };
  const meta = META[stop];
  const productName = project.profile.name;
  const whose = productName ? `${productName}’s` : "your project’s";
  return (
    <>
      <h1 id="stop-title" tabIndex={-1} className="mt-1.5 text-title font-semibold tracking-[-0.025em]">
        {meta.title}
      </h1>
      <p className="mt-1 max-w-[60ch] text-dw-text-muted">{meta.lead(whose)}</p>

      <div key={stop}>
        {stop === "profile.identity" && <IdentityStop profile={project.profile} visual={project.visual} onDone={goOn} />}
        {stop === "profile.platform" && <PlatformStop project={project} onChosen={goOn} />}
        {stop === "profile.library" && <LibraryStop project={project} onChosen={goOn} />}
      </div>

    </>
  );
}

function PlatformStop({ project, onChosen }: { project: ProjectFile; onChosen: () => void }) {
  const fontPairId = project.visual.fontPair ?? PREVIEW_NEUTRALS.fontPair;
  const tokens = resolveForPlate(project.visual, {});
  const options = (["desktop", "mobile", "both"] as const).map((id) => ({
    id,
    label: PLATFORM_LABELS[id],
    description: PLATFORM_DESCRIPTIONS[id],
    tokens,
    fontPairId,
    fontLabel: fontPairLabel(fontPairId),
    sample: <PlatformStage kind={id} productName={project.profile.name} />,
  }));
  const chosen = project.profile.platform;
  return (
    <PlateGrid<Platform>
      key={`platform:${chosen}`}
      label="Platform variants"
      decision="platform"
      options={options}
      chosenId={chosen}
      productName={project.profile.name}
      status="Choosing records the platform and moves to component library."
      onChoose={(id) => {
        projectStore().setProfile("platform", id);
        onChosen();
      }}
    />
  );
}

type PanelRole = ColorRole | "radius";
const PANEL_ROLES: readonly PanelRole[] = ["bg", "accent", "on-accent", "surface", "radius"];

/** shadcn names from the export map: the single-variable row for the role (CONTRACTS §4.2). */
function shadcnName(role: PanelRole): string {
  const target = role === "radius" ? "radius.base" : role;
  return SHADCN_ROWS.find((r) => r.vars.length === 1 && r.roles[0] === target)?.vars[0] ?? "?";
}
/** Role names as css-vars.ts roleCss writes them (CONTRACTS §4.2a). */
const roleName = (role: PanelRole) => `--${role}`;

function LibraryPanel({ library, project }: { library: ComponentLibrary; project: ProjectFile }) {
  const light = project.resolved?.color.light ?? null;
  const rows = PANEL_ROLES.map((role) => {
    const name = library === "shadcn" ? shadcnName(role) : roleName(role);
    const hex = role === "radius" ? null : (light?.[role] ?? null);
    const value = project.resolved === null ? null : role === "radius" ? `${project.resolved.radius}px` : hex;
    return { role, name, hex, value, clash: name === "--accent" };
  });
  return (
    <table className="w-full border-collapse font-mono text-label tabular-nums">
      <caption className="sr-only">{LIBRARY_LABELS[library]} CSS variables, excerpt</caption>
      <tbody>
        {rows.map((r) => (
          <tr key={r.role} className="border-t border-dw-line first:border-t-0">
            <th scope="row" className={`py-1.5 pr-3 text-left ${r.clash ? "font-medium" : "font-normal"}`}>
              {r.name}
            </th>
            <td className="py-1.5 text-right whitespace-nowrap">
              {r.value === null ? (
                <span className="text-dw-text-muted">set in the Color lab</span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  {r.hex !== null && <span aria-hidden="true" className="inline-block size-2.5 border border-dw-line" style={{ background: r.hex }} />}
                  {r.value}
                </span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LibraryStop({ project, onChosen }: { project: ProjectFile; onChosen: () => void }) {
  const options = (["shadcn", "none"] as const).map((id) => ({
    id,
    label: LIBRARY_LABELS[id],
    description: LIBRARY_DESCRIPTIONS[id],
    sample: <LibraryPanel library={id} project={project} />,
  }));
  const chosen = project.profile.componentLibrary;
  return (
    <>
      <PlateGrid<ComponentLibrary>
        key={`library:${chosen}`}
        label="Component library options"
        decision="component library"
        frame="panel"
        options={options}
        chosenId={chosen}
        productName={project.profile.name}
        status="Choosing records the component library and moves to step 2."
        note={<p className="mt-3 text-small text-dw-text-muted">tokens.json is identical either way.</p>}
        onChoose={(id) => {
          projectStore().setProfile("componentLibrary", id);
          onChosen();
        }}
      />
    </>
  );
}
