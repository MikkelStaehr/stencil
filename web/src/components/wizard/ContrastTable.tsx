import { formatRatio } from "@/domain/color/contrast";
import type { PairResult } from "@/domain/color/pairs";

// DESIGN.md "Contrast check presentation": pair, ratio (2 decimals, tabular), and a PASS/FAIL word.
// Never colour alone and never a tick glyph. FAIL is the same 44px tag, inverted.
export function ContrastTable({ caption, results }: { caption: string; results: PairResult[] }) {
  return (
    <table className="w-full border-collapse font-mono text-label tabular-nums">
      <caption className="sr-only">{caption}</caption>
      <thead className="sr-only">
        <tr>
          <th scope="col">Pair</th>
          <th scope="col">Ratio</th>
          <th scope="col">Result (minimum)</th>
        </tr>
      </thead>
      <tbody>
        {results.map((r) => (
          <tr key={`${r.fg}/${r.bg}`} className="h-8 border-t border-dw-line">
            <th scope="row" className="py-0 pr-2 text-left align-middle leading-[1.3] font-normal">
              {r.fg} / {r.bg}
            </th>
            <td className="py-0 text-right align-middle">{formatRatio(r.ratio)}</td>
            <td className="w-[52px] py-0 pl-2 align-middle">
              <span
                className={`block w-11 rounded-full py-0.5 text-center tracking-[0.04em] ${
                  r.pass ? "border border-dw-line text-dw-text-muted" : "bg-primary font-medium text-primary-foreground"
                }`}
              >
                {r.pass ? "PASS" : "FAIL"}
                <span className="sr-only"> (min {r.min})</span>
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
