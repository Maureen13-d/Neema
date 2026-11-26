/**
 * Clinician / CHP supervisor sign-off + Swahili message review.
 * Gates field readiness — never invents clinical approval.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HARDWARE_CHECKS, type MessageEntry } from '@neema/core';
import { BrandMark } from '../ui/BrandMark';
import { Button } from '../ui/Button';
import { LoadingScreen } from '../ui/LoadingScreen';
import { useLocale } from '../hooks/useLocale';
import {
  beginHardwareReport,
  completeHardwareReport,
  ensureMessageReviewRows,
  saveClinicianSignOff,
  saveHardwareCheck,
  saveMessageReview,
} from '../services/governance';
import { getReadiness, type ReadinessReport } from '../services/readiness';

/** Governance desk for triage thresholds, messages, and hardware QA. */
export function SignOffPage() {
  const nav = useNavigate();
  const { lang } = useLocale();
  const [busy, setBusy] = useState(true);
  const [note, setNote] = useState<string | null>(null);
  const [ready, setReady] = useState<ReadinessReport | null>(null);
  const [messages, setMessages] = useState<MessageEntry[]>([]);
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerRole, setReviewerRole] = useState('CHP supervisor');
  const [reviewedOn, setReviewedOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  async function refresh() {
    const [rows, report] = await Promise.all([ensureMessageReviewRows(), getReadiness()]);
    setMessages(rows);
    setReady(report);
  }

  useEffect(() => {
    void refresh()
      .catch((e) => setNote(e instanceof Error ? e.message : String(e)))
      .finally(() => setBusy(false));
  }, []);

  async function signConfig() {
    setBusy(true);
    setNote(null);
    try {
      await saveClinicianSignOff({
        reviewerName,
        reviewerRole,
        reviewedOn,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      setNote(lang === 'sw' ? 'Vizingiti vimesainiwa.' : 'Thresholds signed.');
      await refresh();
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function reviewMessage(key: string, status: 'reviewed' | 'rejected') {
    if (!reviewerName.trim()) {
      setNote(lang === 'sw' ? 'Andika jina la mkaguzi kwanza.' : 'Enter reviewer name first.');
      return;
    }
    setBusy(true);
    try {
      const updated = await saveMessageReview({
        key,
        status,
        reviewerName,
        reviewedOn,
      });
      setMessages(updated);
      await refresh();
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function reviewAllPending() {
    if (!reviewerName.trim()) {
      setNote(lang === 'sw' ? 'Andika jina la mkaguzi kwanza.' : 'Enter reviewer name first.');
      return;
    }
    setBusy(true);
    try {
      for (const m of messages) {
        if (m.status !== 'reviewed') {
          await saveMessageReview({
            key: m.key,
            status: 'reviewed',
            reviewerName,
            reviewedOn,
            notes: 'Batch review from Sign-off desk',
          });
        }
      }
      setNote(lang === 'sw' ? 'Ujumbe wote umekaguliwa.' : 'All messages marked reviewed.');
      await refresh();
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function runHardwarePass() {
    setBusy(true);
    try {
      const report = await beginHardwareReport('Demo band', reviewerName || 'Operator');
      for (const check of HARDWARE_CHECKS) {
        await saveHardwareCheck(report.id, {
          id: check.id,
          result: 'pass',
          notes: 'Recorded from Sign-off desk (lab)',
        });
      }
      await completeHardwareReport(report.id);
      setNote(lang === 'sw' ? 'QA ya vifaa imepitishwa (jaribio).' : 'Hardware QA marked pass (lab).');
      await refresh();
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="screen">
      {busy ? <LoadingScreen /> : null}
      <BrandMark />
      <h1 className="screen-title" style={{ marginTop: '1rem' }}>
        {lang === 'sw' ? 'Sahihi ya kliniki' : 'Clinical sign-off'}
      </h1>
      <p className="screen-sub">
        {lang === 'sw'
          ? 'Mtu pekee ndiye anayethibitisha vizingiti na ujumbe. Hii si utambuzi.'
          : 'Only a person confirms thresholds and messages. This is not a diagnosis.'}
      </p>

      {ready ? (
        <div className="panel" style={{ marginBottom: '1rem' }}>
          <strong>
            {ready.fieldReady
              ? lang === 'sw'
                ? 'Tayari kwa uwanja'
                : 'Field ready'
              : lang === 'sw'
                ? 'Hali ya demo'
                : 'Demo only'}
          </strong>
          {ready.blockers.length > 0 ? (
            <ul className="soft-note" style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem' }}>
              {ready.blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : (
            <p className="soft-note" style={{ margin: '0.35rem 0 0' }}>
              {lang === 'sw' ? 'Milango yote imefungwa.' : 'All readiness gates clear.'}
            </p>
          )}
        </div>
      ) : null}

      {note ? <p className="soft-note">{note}</p> : null}

      <div className="panel">
        <strong>{lang === 'sw' ? 'Mkaguzi' : 'Reviewer'}</strong>
        <div className="field" style={{ marginTop: '0.65rem' }}>
          <label htmlFor="rev-name">{lang === 'sw' ? 'Jina' : 'Name'}</label>
          <input id="rev-name" value={reviewerName} onChange={(e) => setReviewerName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="rev-role">{lang === 'sw' ? 'Wadhifa' : 'Role'}</label>
          <input id="rev-role" value={reviewerRole} onChange={(e) => setReviewerRole(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="rev-date">{lang === 'sw' ? 'Tarehe' : 'Date'}</label>
          <input id="rev-date" type="date" value={reviewedOn} onChange={(e) => setReviewedOn(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="rev-notes">{lang === 'sw' ? 'Maelezo' : 'Notes'}</label>
          <input id="rev-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <Button variant="primary" style={{ width: '100%', marginTop: '0.5rem' }} onClick={() => void signConfig()}>
          {lang === 'sw' ? 'Saini vizingiti vya triage' : 'Sign triage thresholds'}
        </Button>
      </div>

      <div className="panel" style={{ marginTop: '1rem' }}>
        <strong>{lang === 'sw' ? 'Ujumbe wa Kiswahili' : 'Swahili messages'}</strong>
        <p className="soft-note" style={{ margin: '0.35rem 0 0.65rem' }}>
          {lang === 'sw'
            ? 'Kagua kila ujumbe. Rasimu hadi mkaguzi asaini.'
            : 'Review each line. Drafts stay draft until a reviewer signs.'}
        </p>
        <Button variant="secondary" style={{ width: '100%', marginBottom: '0.75rem' }} onClick={() => void reviewAllPending()}>
          {lang === 'sw' ? 'Kagua zote zinazosubiri' : 'Mark all pending reviewed'}
        </Button>
        <ul className="check-list">
          {messages.map((m) => (
            <li key={m.key} className="panel" style={{ marginBottom: '0.5rem', padding: '0.65rem' }}>
              <strong>{m.key}</strong>
              <p className="soft-note" style={{ margin: '0.25rem 0' }}>
                {m.sw}
              </p>
              <p className="soft-note" style={{ margin: 0 }}>
                {m.status}
              </p>
              {m.status !== 'reviewed' ? (
                <div className="btn-row" style={{ marginTop: '0.45rem' }}>
                  <Button variant="secondary" onClick={() => void reviewMessage(m.key, 'reviewed')}>
                    {lang === 'sw' ? 'Imeidhinishwa' : 'Reviewed'}
                  </Button>
                  <Button variant="ghost" onClick={() => void reviewMessage(m.key, 'rejected')}>
                    {lang === 'sw' ? 'Kataa' : 'Reject'}
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      <div className="panel" style={{ marginTop: '1rem' }}>
        <strong>{lang === 'sw' ? 'QA ya vifaa' : 'Hardware QA'}</strong>
        <p className="soft-note" style={{ margin: '0.35rem 0 0.65rem' }}>
          {lang === 'sw'
            ? 'Kwa jaribio: alama pass baada ya ukaguzi wa lab.'
            : 'Lab helper: mark an engineering pass after bench checks.'}
        </p>
        <Button variant="secondary" style={{ width: '100%' }} onClick={() => void runHardwarePass()}>
          {lang === 'sw' ? 'Rekodi pass ya lab' : 'Record lab pass'}
        </Button>
      </div>

      <div className="btn-row" style={{ marginTop: '1rem' }}>
        <Button variant="ghost" onClick={() => nav('/settings')}>
          {lang === 'sw' ? 'Nyuma' : 'Back'}
        </Button>
        <Button variant="ghost" onClick={() => nav('/home')}>
          {lang === 'sw' ? 'Nyumbani' : 'Home'}
        </Button>
      </div>
    </main>
  );
}
