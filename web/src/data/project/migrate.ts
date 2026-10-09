// Version switch for project files. v1 is the only version; v2 adds its upgrade step here.
import type { ParseError } from "@/contracts/errors";
import { SCHEMA_VERSION } from "@/contracts/project";

export function migrate(raw: Record<string, unknown>): { ok: true; value: Record<string, unknown> } | { ok: false; error: ParseError } {
  const version = raw.schemaVersion;
  if (version === SCHEMA_VERSION) return { ok: true, value: raw };
  const newer = typeof version === "number" && version > SCHEMA_VERSION;
  return {
    ok: false,
    error: {
      path: "schemaVersion",
      code: "schema-version",
      message: newer
        ? `This file was saved by a newer version of Stencil (schema ${version}). Open it in that version.`
        : `schemaVersion must be ${SCHEMA_VERSION}. Found ${JSON.stringify(version) ?? "nothing"}.`,
    },
  };
}
