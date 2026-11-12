# Unslop audit

Audited the live Policy Trace UI at https://policy-trace-gray.vercel.app (`/`, `/lab/missing-grant`, `/lab/agent-as-alice`, `/lab/using-true`, `/lab/silent-update`, `/lab/team-notes`, and `/share/[id]` when a snapshot exists) against the signs in [unslop](https://github.com/heydamir/unslop) by Damir Sokolovsky, CC BY 4.0. The skill lives at `skills/unslop/SKILL.md`. Signs were read from `references/signs.md`. This pass is light: the product already had a real brief, real type, and no decoration for its own sake. Fixes stay inside that system. The later editorial pass replaces the page structure.

## Direction

- **Product.** Policy Trace shows a developer whether a Postgres grant or a row level security policy stopped a row.
- **Character.** Exact, quiet, instrument-like.
- **World.** A night bench. A ledger of grants and policies. Hairline rules.
- **Moments.** The 42501 card. The row that is allowed.
- **Signature.** A 2px green rule on a row that came back. Green does nothing else.

## Signs found, and the fix

### Color

- **One accent on everything that wants attention.** `#3ECF8E` marked the selected identity, the selected chip, the tool name, the trace kicker, the Run button, the focus ring, the focused trace card, the visible-row text, and the grant that passed. The sign: a brand color used as a highlight on several elements at once.
  - **Fix.** Green stays on the 2px rule of a returned row and on an allowed grant. The Run button is off-white ink on the canvas. Selection is a surface step. Focus is an ink ring. Tool names and the trace kicker are muted.

### Type

- **Weight 600 on nearly every heading.** `font-semibold` on the landing title, scenario titles, result headings, row titles, and the bypass warning. The skill keeps body at 400 and uses 500 for emphasis. 600 was doing the job of size.
  - **Fix.** Those headings are `font-medium` (500).
- **Tight tracking on a 36px title.** `tracking-tight` on "Policy Trace" and on lab titles. Tight tracking is for display sizes, about 40px and up.
  - **Fix.** Removed `tracking-tight` from those titles.

### Layout

- **The same green job on a button and on a result.** The primary action and the positive result shared one color, so the result did not read as the thing that mattered.
  - **Fix.** The primary action is the off-white button. The positive result is the green rule.

### Details

- **A short status ended with a full stop.** "SQL is allowed." sits as a status line, not a sentence.
  - **Fix.** "SQL is allowed".
- **Focus ring in the accent color.** The keyboard ring used the same green as the result rule.
  - **Fix.** A 2px ink outline, offset 3px.

### Copy, icons, visuals, motion, spacing

- No emoji icons, no custom cursor, no gradient, no glass, no three equal icon cards, no fake metrics, no "Welcome to", no "Get started".
- Spacing already sat on a 4px grid (`mt-4`, `py-5`, `gap-4`, `px-4`). No off-grid values to correct in this pass.
- Motion was limited to a focus outline. Nothing bounced or faded up on scroll. No motion change in this pass.
- The landing has no product picture. That is a thin page, not a fake visual. The editorial pass adds the stage. This pass does not invent a dashboard.

## What this pass left alone

The palette stays `#1C1C1C`, `#F8F8F8`, and `#3ECF8E`. Inter, Manrope, and Source Code Pro stay. The lab still runs the same SQL. Section order on the landing stays a title, then the five scenarios.
