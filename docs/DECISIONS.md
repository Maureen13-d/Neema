# Decisions and assumptions

Recorded while implementing from the Backend Cursor brief (PDF pages 1–8 were available; later sections were referenced but truncated in that PDF).

## Assumptions

1. **BLE packet layout** — Defined in `packages/core/src/protocol.ts` (10-byte vitals notify, 3-byte command). Firmware mirrors this. Change both sides together.
2. **Sleep window in UTC** — Rest-context detection uses UTC hours until the app stores a local timezone.
3. **Baseline learning period** — ~3 days of minute samples before R8 z-scores are trusted.
4. **Web app first** — PWA/Vite harness only; native Flutter shell is roadmap.
5. **SMS** — Prototype opens a prefilled `sms:` link; no silent SMS or gateway.
6. **Clinical thresholds** — Placeholders in `triage.config.json` pending clinician review.

## Explicitly out of scope (per brief)

SpO2, motion, speech recognition, cloud DB, analytics, silent SMS, diagnosis wording, invented first-aid text.
