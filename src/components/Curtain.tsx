interface CurtainProps {
  progress: number; // 0..1
  done: boolean;
}

export function Curtain({ progress, done }: CurtainProps) {
  const pct = Math.round(progress * 100);
  return (
    <div className={`curtain ${done ? 'is-done' : ''}`} aria-hidden={done} aria-live="polite">
      <div className="curtain__inner">
        <svg width="44" height="44" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r="9" fill="none" stroke="#C9A85C" strokeWidth="3" />
          <circle cx="32" cy="32" r="3" fill="#C9A85C" />
          <ellipse
            cx="32"
            cy="32"
            rx="26"
            ry="10"
            fill="none"
            stroke="#F2EADA"
            strokeWidth="2"
            transform="rotate(-18 32 32)"
          />
        </svg>
        <p className="curtain__name">The Grand Planetarium</p>
        <p className="curtain__note">Hanging the exhibits&hellip;</p>
        <div className="curtain__bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="curtain__pct">{pct}%</p>
      </div>
    </div>
  );
}
