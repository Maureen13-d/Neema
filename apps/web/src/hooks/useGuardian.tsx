/**
 * App-wide guardian state: band/simulator, triage, loading/error.
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
import { createVitalsPipeline } from '../services/vitalsPipeline';
import { runTriage } from '../services/triageRunner';
import { applyBandFeedback } from '../services/bandFeedback';
import type { BandSource } from '../services/bandSource';
import { db } from '../storage/db';

interface GuardianState {
  sample: VitalsSample | null;
  triage: TriageResult | null;
  message: string;
  connected: boolean;
  loading: boolean;
  error: string | null;
  connectSimulator: () => Promise<void>;
  disconnect: () => Promise<void>;
  saveBp: (systolic: number, diastolic: number) => Promise<TriageResult | null>;
  saveSymptoms: (codes: SymptomCode[]) => Promise<TriageResult | null>;
  refreshTriage: (sos?: boolean) => Promise<TriageResult | null>;
  clearError: () => void;
}

const GuardianContext = createContext<GuardianState | null>(null);

export function GuardianProvider({ children }: { children: ReactNode }) {
  const bandRef = useRef<BandSource>(createSimulatorBand(1));
  const pipelineRef = useRef(createVitalsPipeline());
  const lastLevel = useRef<string | null>(null);
  const [sample, setSample] = useState<VitalsSample | null>(null);
  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshTriage = useCallback(async (sos = false) => {
    try {
      const result = await runTriage({
        stage: 'pregnancy',
        gestationWeeks: 32,
        sosActive: sos,
        markedResting: true,
        timeZone: 'Africa/Nairobi',
      });
      setTriage(result);
      if (lastLevel.current !== result.level) {
        lastLevel.current = result.level;
        await applyBandFeedback(bandRef.current, result.level);
      }
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, []);

  useEffect(() => {
    const band = bandRef.current;
    const unsub = band.onVitals(async (s) => {
      setSample(s);
      await pipelineRef.current.ingest(s);
      await refreshTriage(s.sos);
    });
    return unsub;
  }, [refreshTriage]);

  const value = useMemo<GuardianState>(
    () => ({
      sample,
      triage,
      message: triage ? getMessageText(triage.messageKey) : 'Connect your band to begin watching.',
      connected,
      loading,
      error,
      async connectSimulator() {
        setLoading(true);
        setError(null);
        try {
          await bandRef.current.connect();
          setConnected(true);
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        } finally {
          setLoading(false);
        }
      },
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
          return await refreshTriage(sample?.sos ?? false);
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
      clearError() {
        setError(null);
      },
    }),
    [sample, triage, connected, loading, error, refreshTriage],
  );

  return <GuardianContext.Provider value={value}>{children}</GuardianContext.Provider>;
}

export function useGuardian(): GuardianState {
  const ctx = useContext(GuardianContext);
  if (!ctx) throw new Error('useGuardian must be used within GuardianProvider');
  return ctx;
}
