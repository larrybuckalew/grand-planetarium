import { PLANETS } from '@/data/planets';
import type { PlanetId } from '@/data/types';

interface PlanetRailProps {
  selected: PlanetId | 'sun' | null;
  onSelect: (id: PlanetId | 'sun') => void;
}

export function PlanetRail({ selected, onSelect }: PlanetRailProps) {
  return (
    <nav className="rail" aria-label="Exhibition catalogue">
      <span className="rail__heading">The Exhibition</span>
      <ul className="rail__list">
        <li>
          <button
            type="button"
            className={`rail__item ${selected === 'sun' ? 'is-active' : ''}`}
            onClick={() => onSelect('sun')}
          >
            <span className="rail__numeral">&#9737;</span>
            <span className="rail__name">The Sun</span>
          </button>
        </li>
        {PLANETS.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              className={`rail__item ${selected === p.id ? 'is-active' : ''}`}
              onClick={() => onSelect(p.id)}
            >
              <span className="rail__numeral">{p.numeral}</span>
              <span className="rail__name">{p.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
