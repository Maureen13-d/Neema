/**
 * Full guardian product state: band/simulator, triage, auto alerts, recheck.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { SymptomCode, TriageResult, VitalsSample } from '@neema/core';
import { getMessageText } from '../services/speech';
import { createSimulatorBand } from '../services/simulatorBand';
import { createWebBluetoothBand } from '../services/webBluetoothBand';
import { createVitalsPipeline } from '../services/vitalsPipeline';
import { runTriage } from '../services/triageRunner';
import { applyBandFeedback } from '../services/bandFeedback';
import type { BandSource } from '../services/bandSource';
import { createRecheckLoop, latestBpId, type RecheckState } from '../services/recheck';
import { runAlertChain } from '../services/alertChain';
import { acknowledgeRed } from '../services/alerts';
import type { EscalationHandle } from '../services/escalation';
import { db } from '../storage/db';

export type BandMode = 'simulator' | 'bluetooth';

interface GuardianState {
  sample: VitalsSample | null;
  triage: TriageResult | null;
  message: string;
  connected: boolean;
  bandMode: BandMode;
  loading: boolean;
  error: string | null;
  pendingSmsHref: string | null;
  activeAlertId: string | null;
  lastChainNote: string | null;
  recheck: RecheckState;
  recheckDueInSec: number | null;
  connectSimulator: () => Promise<void>;
  connectBluetooth: () => Promise<void>;
  disconnect: () => Promise<void>;
  saveBp: (systolic: number, diastolic: number) => Promise<TriageResult | null>;
  saveSymptoms: (codes: SymptomCode[]) => Promise<TriageResult | null>;
  refreshTriage: (sos?: boolean) => Promise<TriageResult | null>;
  acknowledgeActiveRed: () => Promise<void>;
  clearPendingSms: () => void;
  clearError: () => void;
  openPendingSms: () => void;
}

const GuardianContext = createContext<GuardianState | null>(null);

/** Demo builds use a 60s recheck so the loop is testable; production uses config. */
function recheckDelayMs(result: TriageResult): number {
  if (import.meta.env.DEV) return 60_000;
  return (result.recheckInMinutes ?? 45) * 60_000;
}

export function GuardianProvider({ children }: { children: ReactNode }) {
  const bandRef = useRef<BandSource>(createSimulatorBand(1));
  const unsubRef = useRef<(() => void) | null>(null);
  const pipelineRef = useRef(createVitalsPipeline());
  const recheckRef = useRef(createRecheckLoop());
  const escalationRef = useRef<EscalationHandle | null>(null);
  const lastLevel = useRef<string | null>(null);
  const chainInFlight = useRef(false);
  const refreshRef = useRef<(sos?: boolean) => Promise<TriageResult | null>>(async () => null);

  const [sample, setSample] = useState<VitalsSample | null>(null);
  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [connected, setConnected] = useState(false);
  const [bandMode, setBandMode] = useState<BandMode>('simulator');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSmsHref, setPendingSmsHref] = useState<string | null>(null);
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);
  const [lastChainNote, setLastChainNote] = useState<string | null>(null);
  const [recheck, setRecheck] = useState<RecheckState>(recheckRef.current.getState());
  const [recheckDueInSec, setRecheckDueInSec] = useState<number | null>(null);

  const bindBand = useCallback((band: BandSource) => {
    unsubRef.current?.();
    bandRef.current = band;
    unsubRef.current = band.onVitals(async (s) => {
      setSample(s);
      await pipelineRef.current.ingest(s);
      await refreshRef.current(s.sos);
    });
  }, []);

  const handleLevelTransition = useCallback(async (result: TriageResult) => {
    if (lastLevel.current === result.level) {
      setRecheck(recheckRef.current.getState());
      return;
    }
    const prev = lastLevel.current;
    lastLevel.current = result.level;
    await applyBandFeedback(bandRef.current, result.level);

    if (result.level === 'YELLOW') {
      const bps = await db.bp.orderBy('tsMs').toArray();
      recheckRef.current.scheduleInMs(result, latestBpId(bps), recheckDelayMs(result));
      setRecheck(recheckRef.current.getState());
      setLastChainNote(
        import.meta.env.DEV
          ? 'YELLOW: quiet CHP heads-up prepared. Recheck BP in ~60s (demo timer).'
          : `YELLOW: quiet CHP heads-up prepared. Recheck BP in ${result.recheckInMinutes ?? 45} min.`,
      );
    } else if (result.level === 'GREEN' || result.level === 'UNKNOWN') {
      recheckRef.current.cancel();
      setRecheck(recheckRef.current.getState());
    }

    if (
      (result.level === 'RED' || result.level === 'YELLOW') &&
      prev !== result.level &&
      !chainInFlight.current
    ) {
      chainInFlight.current = true;
      try {
        const chain = await runAlertChain(result, { allowDemo: true, skipConsent: true });
        if (chain) {
          setPendingSmsHref(chain.primarySmsHref);
          setActiveAlertId(chain.alertId);
          escalationRef.current?.stop();
          escalationRef.current = chain.escalation;
          setLastChainNote(
            result.level === 'RED'
              ? 'RED: spoken action ready. Open SMS to reach your CHP now.'
              : 'YELLOW: spoken guidance + quiet CHP SMS ready.',
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        chainInFlight.current = false;
      }
    }
  }, []);

  const refreshTriage = useCallback(
    async (sos = false) => {
      try {
        const result = await runTriage({
          stage: 'pregnancy',
          gestationWeeks: 32,
          sosActive: sos,
          markedResting: true,
          timeZone: 'Africa/Nairobi',
        });
        setTriage(result);
        await handleLevelTransition(result);
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return null;
      }
    },
    [handleLevelTransition],
  );

  refreshRef.current = refreshTriage;

  useEffect(() => {
    bindBand(bandRef.current);
    return () => unsubRef.current?.();
  }, [bindBand]);

  useEffect(() => {
    const id = window.setInterval(() => {
      recheckRef.current.isDue();
      const state = recheckRef.current.getState();
      setRecheck({ ...state });
      if (state.status === 'scheduled' && state.dueAtMs) {
        setRecheckDueInSec(Math.max(0, Math.ceil((state.dueAtMs - Date.now()) / 1000)));
      } else if (state.status === 'due') {
        setRecheckDueInSec(0);
      } else {
        setRecheckDueInSec(null);
      }

      void escalationRef.current?.tick().then((step) => {
        if (step.kind === 'notify') {
          setLastChainNote(`Escalation → ${step.label}: contact ${step.contact.name}`);
        }
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const connectBand = useCallback(
    async (mode: BandMode) => {
      setLoading(true);
      setError(null);
      try {
        await bandRef.current.disconnect().catch(() => undefined);
        const next = mode === 'bluetooth' ? createWebBluetoothBand() : createSimulatorBand(1);
        bindBand(next);
        await next.connect();
        setBandMode(mode);
        setConnected(true);
      } catch (err) {
        if (mode === 'bluetooth') {
          try {
            const sim = createSimulatorBand(1);
            bindBand(sim);
            await sim.connect();
            setBandMode('simulator');
            setConnected(true);
            setError('Bluetooth unavailable — using simulator instead.');
          } catch (simErr) {
            setError(simErr instanceof Error ? simErr.message : String(simErr));
          }
        } else {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        setLoading(false);
      }
    },
    [bindBand],
  );

  const value = useMemo<GuardianState>(
    () => ({
      sample,
      triage,
      message: triage ? getMessageText(triage.messageKey) : 'Connect your band to begin watching.',
      connected,
      bandMode,
      loading,
      error,
      pendingSmsHref,
      activeAlertId,
      lastChainNote,
      recheck,
      recheckDueInSec,
      connectSimulator: () => connectBand('simulator'),
      connectBluetooth: () => connectBand('bluetooth'),
      async disconnect() {
        await bandRef.current.disconnect();
        setConnected(false);
      },
      async saveBp(systolic, diastolic) {
        setLoading(true);
        setError(null);
        try {
          await db.bp.put({
            id: crypto.randomUUID(),
            tsMs: Date.now(),
            systolic,
            diastolic,
            enteredBy: 'mother',
            source: 'home_cuff',
          });
          const result = await refreshTriage(sample?.sos ?? false);
          const rs = recheckRef.current.getState();
          if (result && (rs.status === 'due' || rs.status === 'scheduled') && result.level !== 'YELLOW') {
            recheckRef.current.cancel();
            setRecheck(recheckRef.current.getState());
            setRecheckDueInSec(null);
          }
          return result;
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
          return null;
        } finally {
          setLoading(false);
        }
      },
      async saveSymptoms(codes) {
        setLoading(true);
        setError(null);
        try {
          await db.symptoms.put({
            id: crypto.randomUUID(),
            tsMs: Date.now(),
            codes,
            inputMethod: 'tap',
          });
          return await refreshTriage(sample?.sos ?? false);
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
          return null;
        } finally {
          setLoading(false);
        }
      },
      refreshTriage,
      async acknowledgeActiveRed() {
        if (!activeAlertId) return;
        await acknowledgeRed(activeAlertId);
        escalationRef.current?.stop();
        escalationRef.current = null;
        setActiveAlertId(null);
        setPendingSmsHref(null);
        setLastChainNote('RED acknowledged.');
        lastLevel.current = null;
        await refreshTriage(false);
      },
      clearPendingSms() {
        setPendingSmsHref(null);
      },
      clearError() {
        setError(null);
      },
      openPendingSms() {
        if (pendingSmsHref) window.location.href = pendingSmsHref;
      },
    }),
    [
      sample,
      triage,
      connected,
      bandMode,
      loading,
      error,
      pendingSmsHref,
      activeAlertId,
      lastChainNote,
      recheck,
      recheckDueInSec,
      connectBand,
      refreshTriage,
    ],
  );

  return <GuardianContext.Provider value={value}>{children}</GuardianContext.Provider>;
}

export function useGuardian(): GuardianState {
  const ctx = useContext(GuardianContext);
  if (!ctx) throw new Error('useGuardian must be used within GuardianProvider');
  return ctx;
}
