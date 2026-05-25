export function Wordmark({ size = '1.25rem' }: { size?: string }) {
  return (
    <span className="wordmark" style={{ fontSize: size }}>
      <span className="wordmark__dish">dish</span>
      <span className="wordmark__board">board</span>
    </span>
  );
}

export function SplashDots() {
  return (
    <span className="splash-dots" aria-hidden>
      <span />
      <span />
      <span />
    </span>
  );
}
