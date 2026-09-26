import type { ReactNode } from 'react';

interface ControlBarProps {
  paused: boolean;
  speed: number;
  showOrbits: boolean;
  showBelt: boolean;
  showLabels: boolean;
  onTogglePause: () => void;
  onSpeedChange: (v: number) => void;
  onToggleOrbits: () => void;
  onToggleBelt: () => void;
  onToggleLabels: () => void;
}

function Toggle({ label, active, onChange }: { label: string; active: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      className={`ctl-toggle ${active ? 'is-on' : ''}`}
      onClick={onChange}
      aria-pressed={active}
    >
      <span className="ctl-toggle__state" aria-hidden="true">
        {active ? 'On' : 'Off'}
      </span>
      {label}
    </button>
  );
}

export function ControlBar(props: ControlBarProps): ReactNode {
  return (
    <div className="ctl" role="group" aria-label="Observation controls">
      <button type="button" className="ctl-play" onClick={props.onTogglePause}>
        {props.paused ? (
          <svg width="11" height="12" viewBox="0 0 11 12" aria-hidden="true">
            <path d="M1 1l9 5-9 5z" fill="currentColor" />
          </svg>
        ) : (
          <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true">
            <path d="M1.5 1v10M8.5 1v10" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        )}
        <span>{props.paused ? 'Resume' : 'Pause'}</span>
      </button>

      <label className="ctl-speed">
        <span className="ctl-speed__label">
          Pace <em>{props.speed.toFixed(1)}&times;</em>
        </span>
        <input
          type="range"
          min="0"
          max="4"
          step="0.1"
          value={props.speed}
          onChange={(e) => props.onSpeedChange(Number(e.target.value))}
          aria-label="Orbital pace"
        />
      </label>

      <div className="ctl-toggles">
        <Toggle label="Orbits" active={props.showOrbits} onChange={props.onToggleOrbits} />
        <Toggle label="Belt" active={props.showBelt} onChange={props.onToggleBelt} />
        <Toggle label="Labels" active={props.showLabels} onChange={props.onToggleLabels} />
      </div>
    </div>
  );
}
