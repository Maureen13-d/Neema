/**
 * Minimal live harness for backend wiring — not the real mother-facing UI.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { TriageResult, VitalsSample } from '@neema/core';
import { createSimulatorBand } from '../services/simulatorBand';
import { createVitalsPipeline } from '../services/vitalsPipeline';
import { runTriage } from '../services/triageRunner';
import { buildAlertSmsBody, buildSmsLink, raiseAlert, acknowledgeRed } from '../services/alerts';
import { acknowledgeAndStop, startEscalation, type EscalationHandle } from '../services/escalation';
import { LocationError, requestAlertLocation } from '../services/location';
import { getMessageText, speakMessageKey } from '../services/speech';
import { db } from '../storage/db';

type SourceKind = 'simulator' | 'bluetooth';

export function Harness() {
  const [sourceKind, setSourceKind] = useState<SourceKind>('simulator');
  const [connected, setConnected] = useState(false);
  const [sample, setSample] = useState<VitalsSample | null>(null);
  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [systolic, setSystolic] = useState('120');
  const [diastolic, setDiastolic] = useState('80');
  const [symptom, setSymptom] = useState('headache');
  const [log, setLog] = useState<string[]>([]);
  const [stickyRed, setStickyRed] = useState<TriageResult | null>(null);
  const [smsHref, setSmsHref] = useState<string | null>(null);
  const escalationRef = useRef<EscalationHandle | null>(null);

  const band = useMemo(() => createSimulatorBand(1), []);
  const pipeline = useMemo(() => createVitalsPipeline(), []);

  useEffect(() => {
    const id = window.setInterval(async () => {
      const handle = escalationRef.current;
      if (!handle) return;
      const step = await handle.tick();
      if (step.kind === 'notify') {
        const href = buildSmsLink(step.contact.phone, `NEEMA escalate (${step.label}): ${step.contact.name}`);
        setSmsHref(href);
        setLog((l) => [`Escalation → ${step.label}: ${step.contact.name}`, ...l]);
      }
    }, 5_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const unsub = band.onVitals(async (s) => {
      setSample(s);
      await pipeline.ingest(s);
      const result = await runTriage({
        stage: 'pregnancy',
        gestationWeeks: 32,
        sosActive: s.sos,
        markedResting: true,
        stickyRed,
      });
      setTriage(result);
      if (result.level === 'RED') setStickyRed(result);
    });
    return unsub;
  }, [band, pipeline, stickyRed]);

  async function connect() {
    if (sourceKind === 'bluetooth') {
      try {
        const { createWebBluetoothBand } = await import('../services/webBluetoothBand');
        const real = createWebBluetoothBand();
        await real.connect();
        setConnected(true);
        setLog((l) => ['Connected via Web Bluetooth', ...l]);
      } catch (err) {
        setLog((l) => [`Bluetooth failed: ${String(err)}`, ...l]);
      }
      return;
    }
    await band.connect();
    setConnected(true);
    setLog((l) => ['Simulator connected', ...l]);
  }

  async function disconnect() {
    await band.disconnect();
    setConnected(false);
  }

  async function saveBp() {
    await db.bp.put({
      id: crypto.randomUUID(),
      tsMs: Date.now(),
      systolic: Number(systolic),
      diastolic: Number(diastolic),
      enteredBy: 'mother',
      source: 'home_cuff',
    });
    setLog((l) => [`BP saved ${systolic}/${diastolic}`, ...l]);
  }

  async function saveSymptom() {
    await db.symptoms.put({
      id: crypto.randomUUID(),
      tsMs: Date.now(),
      codes: [symptom as 'headache'],
      inputMethod: 'tap',
    });
    setLog((l) => [`Symptom saved: ${symptom}`, ...l]);
  }

  async function triggerAlert() {
    if (!triage || (triage.level !== 'RED' && triage.level !== 'YELLOW')) return;
    const level = triage.level;
    const contacts = [
      {
        id: 'chp-1',
        name: 'CHP Amina',
        role: 'chp' as const,
        phone: '+254700000000',
        escalationOrder: 1,
      },
      {
        id: 'family-1',
        name: 'Family',
        role: 'family' as const,
        phone: '+254711111111',
        escalationOrder: 2,
      },
      {
        id: 'sup-1',
        name: 'Supervisor',
        role: 'supervisor' as const,
        phone: '+254722222222',
        escalationOrder: 3,
      },
    ];

    let locationUrl: string | undefined;
    try {
      const loc = await requestAlertLocation();
      locationUrl = loc.mapsUrl;
      setLog((l) => [`Location ok (±${loc.accuracyM ?? '?'}m)`, ...l]);
    } catch (err) {
      const msg = err instanceof LocationError ? err.message : String(err);
      setLog((l) => [`Location skipped: ${msg}`, ...l]);
    }

    const draft = {
      level,
      firedRules: triage.firedRules,
      motherName: 'Demo',
      reasonCode: triage.reasons[0] ?? 'alert',
      ...(locationUrl ? { locationUrl } : {}),
    };
    const { alert, smsLinks } = await raiseAlert(draft, contacts);
    const first = smsLinks[0];
    if (first) setSmsHref(first.href);
    if (level === 'RED') {
      escalationRef.current?.stop();
      escalationRef.current = startEscalation(alert.id, contacts);
    }
    await speakMessageKey(triage.messageKey);
    setLog((l) => [`Alert ${alert.id} ${level}: ${buildAlertSmsBody(draft)}`, ...l]);
  }

  async function ack() {
    const latest = await db.alerts.orderBy('tsMs').reverse().first();
    if (latest && escalationRef.current) {
      await acknowledgeAndStop(latest.id, escalationRef.current);
    } else if (latest) {
      await acknowledgeRed(latest.id);
    }
    escalationRef.current = null;
    setStickyRed(null);
    setLog((l) => ['RED acknowledged', ...l]);
  }

  async function setScenario(n: 0 | 1 | 2 | 3) {
    await band.sendCommand({ kind: 'demo', scenario: n });
    setLog((l) => [`Demo scenario ${n}`, ...l]);
  }

  const levelColor =
    triage?.level === 'RED'
      ? '#b00020'
      : triage?.level === 'YELLOW'
        ? '#a67c00'
        : triage?.level === 'GREEN'
          ? '#1b5e20'
          : '#555';

  return (
    <main style={{ fontFamily: 'Segoe UI, sans-serif', maxWidth: 720, margin: '1.5rem auto', padding: 16 }}>
      <h1 style={{ marginBottom: 4 }}>Neema backend harness</h1>
      <p style={{ color: '#555', marginTop: 0 }}>
        Dev-only live view. Not the mother-facing UI.
      </p>

      <section style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <select value={sourceKind} onChange={(e) => setSourceKind(e.target.value as SourceKind)}>
          <option value="simulator">Simulator</option>
          <option value="bluetooth">Web Bluetooth</option>
        </select>
        <button type="button" onClick={connect} disabled={connected}>
          Connect
        </button>
        <button type="button" onClick={disconnect} disabled={!connected}>
          Disconnect
        </button>
        <button type="button" onClick={() => setScenario(1)}>
          Scenario A
        </button>
        <button type="button" onClick={() => setScenario(2)}>
          Scenario B
        </button>
        <button type="button" onClick={() => setScenario(3)}>
          Scenario D
        </button>
      </section>

      <section
        style={{
          border: `3px solid ${levelColor}`,
          borderRadius: 8,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 700, color: levelColor }}>
          {triage?.level ?? '—'}
        </div>
        <div>{triage ? getMessageText(triage.messageKey) : 'Connect a source to begin.'}</div>
        <div style={{ marginTop: 8, fontSize: 14, color: '#333' }}>
          HR: {sample?.heartRate ?? '—'} bpm · Temp: {sample?.skinTempC?.toFixed(2) ?? '—'} °C ·
          SOS: {sample?.sos ? 'yes' : 'no'} · demo: {sample?.demo ? 'yes' : 'no'}
        </div>
        <div style={{ fontSize: 13, color: '#666' }}>
          Rules: {triage?.firedRules.join(', ') ?? '—'} · reasons: {triage?.reasons.join(', ') ?? '—'}
        </div>
      </section>

      <section style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <label>
            Systolic{' '}
            <input value={systolic} onChange={(e) => setSystolic(e.target.value)} style={{ width: 70 }} />
          </label>
          <label>
            Diastolic{' '}
            <input value={diastolic} onChange={(e) => setDiastolic(e.target.value)} style={{ width: 70 }} />
          </label>
          <button type="button" onClick={saveBp}>
            Save BP
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={symptom} onChange={(e) => setSymptom(e.target.value)}>
            <option value="headache">headache</option>
            <option value="blurred_vision">blurred_vision</option>
            <option value="upper_abdominal_pain">upper_abdominal_pain</option>
            <option value="heavy_bleeding">heavy_bleeding</option>
            <option value="baby_moving_less">baby_moving_less</option>
            <option value="fever_chills">fever_chills</option>
          </select>
          <button type="button" onClick={saveSymptom}>
            Save symptom
          </button>
          <button type="button" onClick={triggerAlert}>
            Raise alert / speak
          </button>
          <button type="button" onClick={ack}>
            Acknowledge RED
          </button>
        </div>
        {smsHref ? (
          <a href={smsHref} onClick={() => setLog((l) => [`Opened SMS link`, ...l])}>
            Open prefilled SMS ({buildSmsLink('+254700000000', '…')})
          </a>
        ) : null}
      </section>

      <section>
        <h2 style={{ fontSize: 16 }}>Log</h2>
        <ul style={{ fontSize: 13, paddingLeft: 18 }}>
          {log.slice(0, 12).map((line, i) => (
            <li key={`${i}-${line.slice(0, 12)}`}>{line}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
