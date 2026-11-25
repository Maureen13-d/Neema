# Governance: sign-off, language review, hardware QA, local auth

These are **human processes** backed by code gates. The software cannot invent a clinician signature or a native-speaker review.

## 1. Clinician-signed thresholds

- Placeholders live in `packages/core/src/config/triage.config.json`.
- Record a real review with `saveClinicianSignOff()` / `recordClinicianSignOff()`.
- `assertConfigSignedForFieldUse` / readiness `fieldReady` block unsupervised field alerts until signed.
- Demo harness may use `allowDemo: true`.

## 2. Swahili review

- Draft copy is in `packages/core/src/messages/sw.json`.
- Per-key status via `saveMessageReview()` — status becomes `reviewed` only after a native speaker + CHP checks wording.
- First-aid text remains `TODO(clinician)` and must not be invented in code.

## 3. Hardware validation

- Checklist in `HARDWARE_CHECKS` (`hardwareValidation.ts`).
- Persist reports with `beginHardwareReport` / `saveHardwareCheck` / `completeHardwareReport`.
- `engineeringPass` ≠ clinical validation. Pitch must say prototype sensors.

## 4. Local auth (no cloud accounts)

- PIN via `setPin` / `unlockWithPin` / `lockSession` (Web Crypto, IndexedDB).
- `requireShareConsent('chp'|'family'|'nurse')` before sharing.
- Out of scope by product brief: cloud user accounts, analytics, remote auth servers.
