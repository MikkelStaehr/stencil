// View helpers for the Profile lab: how profile values read in the rail. Which stops are open is owned by domain/decisions.ts.
import type { ComponentLibrary, Platform, ProjectFile } from "@/contracts/project";
import { isStopDecided } from "@/domain/decisions";
import type { StopRow } from "@/components/wizard/SubDecisionList";

export type ProfileStop = "profile.identity" | "profile.platform" | "profile.library";

export const PLATFORM_LABELS: Record<Platform, string> = { desktop: "Desktop", mobile: "Mobile", both: "Both" };
export const LIBRARY_LABELS: Record<ComponentLibrary, string> = { shadcn: "shadcn/ui", none: "None" };

export function profileRows(p: ProjectFile): StopRow<ProfileStop>[] {
  const { name, platform, componentLibrary } = p.profile;
  return [
    { id: "profile.identity", label: "Name & type", value: isStopDecided(p, "profile.identity") ? name : null },
    { id: "profile.platform", label: "Platform", value: platform === null ? null : PLATFORM_LABELS[platform] },
    { id: "profile.library", label: "Component library", value: LIBRARY_LABELS[componentLibrary] },
  ];
}
