/** Full-screen loading state with calm motion. */
export function LoadingScreen({ message = 'Neema inafanya kazi…' }: { message?: string }) {
  return (
    <div className="overlay" role="status" aria-live="polite">
      <div className="overlay-card">
        <div className="spinner" aria-hidden />
        <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>{message}</p>
      </div>
    </div>
  );
}
