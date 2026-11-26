# Decisions and assumptions

Recorded while implementing from the Backend Cursor brief.

## Assumptions

1. **BLE packet layout** — Migrated to the Nov 2025 brief contract in `packages/core/src/protocol.ts`: 12-byte vitals notify (version, flags, uint16 HR, int16 temp×100, seq, battery, signal, reserved), 2-byte commands, UUIDs `7a1c0001/2/3-5e3b-…`, device name prefix `Neema-`. Firmware mirrors this. Older 10-byte/`6e65656d-…` packets are **not** accepted.
2. **Sleep window timezone** — Rest-context uses `Africa/Nairobi` by default via `Intl` (`TriageInput.timeZone`).
3. **Baseline learning period** — ~3 days of minute samples before R8 z-scores are trusted.
4. **Web app first** — Vite/React PWA; native Flutter shell is roadmap.
5. **SMS** — Prototype opens a prefilled `sms:` link; no silent SMS or gateway. Copy must say “open the message”, never “we have messaged”.
6. **Clinical thresholds** — Nested placeholders in `triage.config.json` (brief shape + sleep window / calibration / warning symptoms). Pending clinician review.
7. **R10 gestation gate** — Brief table fires for any pregnancy; when `gestationWeeks` is provided we still require ≥ `reducedMovementMinGestationWeeks` (default 28).
8. **Follow-up step interval** — Default 5 minutes between watch → warn → act → chase. Chase page has a demo “Advance step” control.

## Explicitly out of scope (per brief)

SpO2, motion, speech recognition, cloud DB, analytics, silent SMS, diagnosis wording, invented first-aid text.

## Demo-chain fixes (fix/demo-chain)

7. **Band feedback never sets SOS** — `vibrate: 'sos'` is only a vibration pattern. The simulator used to latch SOS on it, so RED re-raised itself forever. SOS now comes only from the band long-press, the simulator's `pressSos()`, or the app SOS button (hold 2 s).
8. **Stage comes from the Passport** — live triage reads `stage` / `gestationWeeks` from the profile (demo steps override it). ASSUMPTION: an encrypted profile can't be read without the PIN, so it falls back to pregnancy with no gestation week (R10 stays silent).
9. **Sustained signs mean sustained** — R6/R7/R8 need valid readings spanning the full window (fever on two readings 10 minutes apart), and band data older than `vitalsStaleMinutes` (5) is UNKNOWN.
10. **SMS reasons in plain words** — `packages/core/src/messages/reasons.ts` maps reason codes to short Swahili/English phrases (draft, needs native + CHP review) and picks the most urgent reason. YELLOW SMS goes to the CHP only; RED goes to the CHP and one family contact, each as a separate SMS (a group text would become MMS and need data).
11. **Who may clear RED** — `acknowledgeRed(id, at, by)` with `by` = `chp_replied` | `mother_on_the_way` | `clinician_cleared`. After acknowledgement the same evidence doesn't raise a new alert for 30 minutes; a new rule (e.g. SOS) does.
12. **Contract change** — `AlertRecord` gains optional `reasons` and `acknowledgedBy`; `triage.config.json` gains `vitalsStaleMinutes`.
13. **Stage demo player** — Settings → Stage demo seeds scenarios A, B1, B2, C, D from `DEMO_SCENARIOS` into IndexedDB and runs the real chain. It is hidden once the app is field-ready. In demo mode the CHP "replies" (scripted, labelled as such) 6 s after the mother opens the CHP SMS.
