# Demo script

A 60 to 90 second screen recording of the live site, shot on a phone, in portrait. Record [https://policy-trace-gray.vercel.app](https://policy-trace-gray.vercel.app). Speak the voiceover while you tap, or record the voiceover later and lay it under the picture. Do not narrate setup, and do not mention how long the project took.

The money shot is the pair of results on `/lab/missing-grant`: a missing `GRANT` raises `42501`, a missing policy returns an empty grid with no error, and the trace is what names each layer.

Total runtime: about 80 seconds.

## Shot list

### 0:00–0:08 — Land on the lab

**Screen.** Open the live homepage. Pause long enough to read the title and the first sentence, then tap **Missing grant**.

**Voiceover.** "Policy Trace is a lab for the two checks Postgres runs before a row comes back: the grant, then the policy."

### 0:08–0:28 — Money shot, part one: 42501

**Screen.** You are Alice, on the **Missing grant** chip. The owner policy is in the editor, and there is no `SELECT` grant. Wait until the `42501` card is on screen. Point at the kicker "Grant layer, not policy" and the headline "42501 permission denied." Open the trace drawer and leave Alice's "Q4 plan" and Bob's "Hiring notes" visible for a beat.

**Voiceover.** "This table has an owner policy, but authenticated has no select grant. Postgres raises 42501 and never runs the policies. That is the grant layer, not the policy layer."

### 0:28–0:50 — Money shot, part two: silent empty

**Screen.** Close the drawer if it covers the chips. Switch to **Silent empty select**. Wait for the empty grid. The kicker should read "Policy layer" and the headline "0 rows returned." Open the trace again. Both rows are listed, the checks are empty, and the detail says the query succeeded with no error, and that an empty result is not a 42501.

**Voiceover.** "Add the grant and leave row level security on, with no select policy. The query succeeds, returns no rows, and raises no error. It looks like the same failure in an app that only checks the result. The trace is what shows it is not."

### 0:50–1:02 — The repaired read

**Screen.** Switch to **Grant and owner policy**. Alice's "Q4 plan" appears. Stay on Alice. In the trace, Bob's "Hiring notes" stay hidden because `USING` did not match.

**Voiceover.** "Put both layers back and Alice sees her own row. Bob's row is still there in the trace, and using did not match."

### 1:02–1:14 — One more beat, optional if you are short on time

**Screen.** If you still have fifteen seconds, jump to `/lab/silent-update` and stay on **Update policy only**. The headline should be "UPDATE changed 0 rows," with no error. If you are already near 80 seconds, skip this shot and go to the close.

**Voiceover.** "The same silence shows up on an update. Without a select policy, the write matches nothing and still raises no error."

### 1:14–1:20 — Close

**Screen.** Go back to the homepage, or stay on the trace and cut to the live URL on a card: `https://policy-trace-gray.vercel.app`. End on the URL, not on a logo sting.

**Voiceover.** "The lab, the SQL, and the tutorial are at policy-trace-gray.vercel.app."

## Notes for a phone take

- Record the production site, not a protected preview.
- Use Alice for the money shot. Do not switch to `service_role` in this cut; the bypass warning is a different lesson.
- Wait for each run to finish before you talk about the result. The first load on **Missing grant** should already be a `42501` card.
- If a run is slow, hold the previous frame and keep speaking only after the new headline is visible.
- Cut any take that shows a configuration notice, a network error, or the Vercel login wall.
