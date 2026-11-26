import { useEffect, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '../hooks/useLocale';
import { IconChevron, IconFeel, IconPressure, IconQr } from './icons';

/** Sheet behind the centre "+" button: the things a mother can add or show. */
export function QuickAddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate();
  const { t } = useLocale();
  const firstRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const options: { to: string; title: string; sub: string; icon: ReactNode }[] = [
    { to: '/bp', title: t('add_bp'), sub: t('add_bp_sub'), icon: <IconPressure /> },
    { to: '/symptoms', title: t('how_feel'), sub: t('feel_sub'), icon: <IconFeel /> },
    {
      to: '/check-in',
      title: t('checkin_title'),
      sub: t('checkin_sub'),
      icon: <IconFeel />,
    },
    { to: '/summary', title: t('nurse_title'), sub: t('nurse_sub'), icon: <IconQr /> },
  ];

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-add-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet__grip" aria-hidden />
        <h2 className="sheet__title" id="quick-add-title">
          {t('add_title')}
        </h2>
        {options.map((opt, i) => (
          <button
            key={opt.to}
            ref={i === 0 ? firstRef : undefined}
            type="button"
            className="sheet-option"
            onClick={() => {
              onClose();
              nav(opt.to);
            }}
          >
            <span className="sheet-option__icon">{opt.icon}</span>
            <span>
              <strong>{opt.title}</strong>
              <span>{opt.sub}</span>
            </span>
            <span className="check-row__chev">
              <IconChevron />
            </span>
          </button>
        ))}
        <button type="button" className="btn btn-ghost" style={{ width: '100%' }} onClick={onClose}>
          {t('close')}
        </button>
      </div>
    </div>
  );
}
