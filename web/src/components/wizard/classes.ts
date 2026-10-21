// Chrome button classes shared by the wizard's steps and notices (one owner, so they can't drift).

/** The secondary button: 44px, 1px --ctl border on --surface, 10px radius, hover colour on duration.fast. Callers add wrapping behaviour. */
export const SECONDARY = "inline-flex min-h-11 items-center justify-center rounded-sm border border-dw-ctl bg-dw-surface px-4 font-medium transition-colors duration-(--duration-fast) ease-standard hover:bg-dw-hover";
