import { useLocale } from '../hooks/useLocale';

/** Compact brand chip — always visible on mother screens. */
export function BrandMark({ showSub = false }: { showSub?: boolean }) {
  const { t } = useLocale();
  return (
    <div className="brand-mark">
      <img src="/brand/icon.jpg" alt="" width={42} height={42} />
      <div>
        <strong>Neema</strong>
        {showSub ? <span>{t('brand_sub')}</span> : null}
      </div>
    </div>
  );
}
