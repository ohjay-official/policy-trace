# Lab matrix results

These files are the second full lab matrix, recorded on 15 November 2026 in Africa/Lagos (UTC+1), against the hosted database.

Each file has 75 rows: 5 labs × 3 chips × 5 identities (`anon`, `alice`, `bob`, `agent-alice`, `service_role`). Together they are 150 runs, mobile and desktop.

Every row has an empty `problems` list. When `sqlstate` is `42501`, `err` is the Postgres error text (for example `permission denied for table documents`), not a failed run. The UI kicker in each row is `Grant layer, not policy` for those 42501 runs, `RLS bypass` when `service_role` was selected and the grant passed, and `Policy layer` otherwise.

The original capture also stored a `log` object, which is omitted here. The mobile log recorded 18 aborted Next.js RSC navigations (`net::ERR_ABORTED`) during lab switches; those are not matrix mismatches.
