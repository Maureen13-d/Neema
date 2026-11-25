# Neema — Offline Maternal Guardian

Local-first maternal early-warning prototype for the TechSavanna hackathon (AI for Health).

The phone app combines band vitals (heart rate + skin temperature), manual blood pressure, and reported symptoms into a deterministic GREEN / YELLOW / RED / UNKNOWN decision. Raw data stays on the phone; only alert SMS leaves.

## Packages

| Path | Role |
|---|---|
| `packages/core` | Pure TypeScript: types, BLE protocol, triage, baseline, nurse summary |
| `apps/web` | Vite PWA shell: storage, services, minimal dev harness (not final UI) |
| `firmware/neema-band` | ESP32 band firmware (PlatformIO) |

## Quick start

```bash
pnpm install
pnpm --filter @neema/core test
pnpm dev
```

## Safety rules

- Rules decide triage level; ML may only escalate.
- UNKNOWN is never GREEN.
- RED stays sticky until acknowledged.
- Thresholds live in versioned JSON, not hard-coded clinical claims.
