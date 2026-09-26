import { SUN } from '@/data/planets';
import type { Planet, PlanetId } from '@/data/types';

interface PlaqueProps {
  planet: Planet | PlanetId | 'sun' | null;
  onClose: () => void;
}

export function Plaque({ planet, onClose }: PlaqueProps) {
  const isSun = planet === 'sun';
  const p = isSun ? null : (planet as Planet | null);
  const open = planet !== null;

  const title = isSun ? SUN.name : (p?.name ?? '');
  const numeral = isSun ? SUN.numeral : (p?.numeral ?? '');
  const kind = isSun ? SUN.kind : (p?.kind ?? '');
  const tagline = isSun ? SUN.tagline : (p?.tagline ?? '');
  const description = isSun ? SUN.description : (p?.description ?? '');
  const feature = isSun ? SUN.feature : (p?.feature ?? '');
  const stats = isSun ? SUN.stats : (p?.stats ?? []);

  return (
    <aside
      className={`plaque ${open ? 'is-open' : ''}`}
      aria-hidden={!open}
      aria-label={`Exhibit: ${title}`}
    >
      <div className="plaque__frame">
        <button type="button" className="plaque__close" onClick={onClose} aria-label="Close exhibit">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>

        <p className="plaque__kind">{kind}</p>
        <h2 className="plaque__title">
          <span className="plaque__numeral">{numeral}</span>
          {title}
        </h2>
        <p className="plaque__tagline">{tagline}</p>

        <div className="plaque__rule" aria-hidden="true">
          <span />
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <circle cx="5" cy="5" r="3.2" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
          <span />
        </div>

        <p className="plaque__description">{description}</p>

        <dl className="plaque__stats">
          {stats.map((s) => (
            <div className="plaque__stat" key={s.label}>
              <dt>{s.label}</dt>
              <dd>{s.value}</dd>
            </div>
          ))}
        </dl>

        <p className="plaque__feature">
          <span className="plaque__feature-mark">N.B.</span> {feature}
        </p>
      </div>
    </aside>
  );
}
