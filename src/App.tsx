import { useCallback, useEffect, useRef, useState } from 'react';
import { SolarSystem } from '@/scene/SolarSystem';
import { Plaque } from '@/components/Plaque';
import { PlanetRail } from '@/components/PlanetRail';
import { ControlBar } from '@/components/ControlBar';
import { Curtain } from '@/components/Curtain';
import { VisitModal } from '@/components/VisitModal';
import { PLANETS, PLANET_MAP } from '@/data/planets';
import type { PlanetId } from '@/data/types';

type Selection = PlanetId | 'sun' | null;

const WALK: (PlanetId | 'sun')[] = ['sun', ...PLANETS.map((p) => p.id)];

function App() {
  const canvasHost = useRef<HTMLDivElement>(null);
  const labelHost = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SolarSystem | null>(null);

  const [selected, setSelected] = useState<Selection>(null);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showOrbits, setShowOrbits] = useState(true);
  const [showBelt, setShowBelt] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [visitOpen, setVisitOpen] = useState(false);
  const [loadDone, setLoadDone] = useState(0);
  const [loadTotal, setLoadTotal] = useState(0);
  const [curtainDone, setCurtainDone] = useState(false);

  useEffect(() => {
    if (!canvasHost.current || !labelHost.current) return;
    const engine = new SolarSystem(canvasHost.current, labelHost.current, {
      onHover: () => {},
      onSelect: setSelected,
      onLoadProgress: (done, total) => {
        setLoadDone(done);
        setLoadTotal(total);
      },
    });
    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Safety: never hold the curtain longer than 12s, even if a texture stalls.
  useEffect(() => {
    const t = window.setTimeout(() => setCurtainDone(true), 12000);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (loadTotal > 0 && loadDone >= loadTotal) {
      const t = window.setTimeout(() => setCurtainDone(true), 500);
      return () => window.clearTimeout(t);
    }
  }, [loadDone, loadTotal]);

  useEffect(() => void engineRef.current?.setSelected(selected), [selected]);
  useEffect(() => void engineRef.current?.setSpeed(speed), [speed]);
  useEffect(() => void engineRef.current?.setPaused(paused), [paused]);
  useEffect(() => void engineRef.current?.setShowOrbits(showOrbits), [showOrbits]);
  useEffect(() => void engineRef.current?.setShowBelt(showBelt), [showBelt]);
  useEffect(() => void engineRef.current?.setShowLabels(showLabels), [showLabels]);

  // Keyboard: arrows walk the catalogue, Esc steps back.
  const walkTo = useCallback((dir: 1 | -1) => {
    setSelected((cur) => {
      const idx = cur === null ? -1 : WALK.indexOf(cur);
      return WALK[Math.min(WALK.length - 1, Math.max(0, idx + dir))];
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Escape') {
        if (visitOpen) setVisitOpen(false);
        else setSelected(null);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        walkTo(1);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        walkTo(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visitOpen, walkTo]);

  const tonight = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="app">
      <div className="app__canvas" ref={canvasHost} aria-label="Interactive 3D solar system" role="img" />
      <div className="app__labels" ref={labelHost} aria-hidden="true" />

      <header className="masthead">
        <div className="masthead__brand">
          <span className="masthead__mark" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 64 64" aria-hidden="true">
              <circle cx="32" cy="32" r="9" fill="none" stroke="#C9A85C" strokeWidth="3" />
              <circle cx="32" cy="32" r="3" fill="#C9A85C" />
              <ellipse cx="32" cy="32" rx="26" ry="10" fill="none" stroke="#F2EADA" strokeWidth="2" transform="rotate(-18 32 32)" />
            </svg>
          </span>
          <div className="masthead__words">
            <span className="masthead__name">The Grand Planetarium</span>
            <span className="masthead__sub">A Walking Tour of Eight Worlds</span>
          </div>
        </div>
        <nav className="masthead__nav" aria-label="Site">
          <button type="button" onClick={() => setSelected(null)}>Exhibition</button>
          <button
            type="button"
            className={showOrbits ? 'is-active' : ''}
            onClick={() => setShowOrbits((v) => !v)}
          >
            Orbits
          </button>
          <button type="button" onClick={() => setVisitOpen(true)}>Visit</button>
        </nav>
      </header>

      <section className="overture" aria-hidden={selected !== null}>
        <p className="overture__eyebrow">Now Showing &mdash; Hall of Orbits</p>
        <h1 className="overture__title">
          Eight Worlds,<br />
          <em>One Slow Waltz</em>
        </h1>
        <p className="overture__lede">
          Step through the doors. The Sun burns at the center of this hall, and the
          planets keep their ancient appointments around it &mdash; arranged tonight just
          as they hang in the real sky. Touch any world to read its plaque.
        </p>
        <p className="overture__date">The hall is arranged for {tonight}.</p>
      </section>

      <PlanetRail selected={selected} onSelect={setSelected} />
      <Plaque
        planet={selected ? (selected === 'sun' ? 'sun' : (PLANET_MAP.get(selected) ?? null)) : null}
        onClose={() => setSelected(null)}
      />
      <ControlBar
        paused={paused}
        speed={speed}
        showOrbits={showOrbits}
        showBelt={showBelt}
        showLabels={showLabels}
        onTogglePause={() => setPaused((p) => !p)}
        onSpeedChange={setSpeed}
        onToggleOrbits={() => setShowOrbits((v) => !v)}
        onToggleBelt={() => setShowBelt((v) => !v)}
        onToggleLabels={() => setShowLabels((v) => !v)}
      />

      <footer className="colophon">
        <span>The Grand Planetarium</span>
        <span className="colophon__dot" aria-hidden="true">&middot;</span>
        <span>Drag to look &middot; scroll to approach &middot; click a world to read</span>
        <span className="colophon__dot" aria-hidden="true">&middot;</span>
        <span>Surface maps &copy; Solar System Scope, CC BY 4.0</span>
      </footer>

      <VisitModal open={visitOpen} onClose={() => setVisitOpen(false)} />
      <Curtain progress={loadTotal === 0 ? 0 : loadDone / loadTotal} done={curtainDone} />
    </div>
  );
}

export default App;
