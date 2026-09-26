interface VisitModalProps {
  open: boolean;
  onClose: () => void;
}

export function VisitModal({ open, onClose }: VisitModalProps) {
  return (
    <div className={`visit ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <div className="visit__backdrop" onClick={onClose} />
      <div className="visit__panel" role="dialog" aria-modal={open} aria-label="Plan your visit">
        <button type="button" className="plaque__close" onClick={onClose} aria-label="Close">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>

        <p className="plaque__kind">The Grand Planetarium</p>
        <h2 className="visit__title">Plan Your Visit</h2>

        <div className="plaque__rule" aria-hidden="true">
          <span />
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <circle cx="5" cy="5" r="3.2" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
          <span />
        </div>

        <p className="visit__text">
          The hall is arranged for tonight&rsquo;s sky &mdash; each world sits where it truly
          is this evening, computed from JPL approximate Keplerian elements. Distances
          are compressed so the inner system stays in view; directions are true.
        </p>

        <h3 className="visit__heading">Gallery etiquette</h3>
        <ul className="visit__list">
          <li><strong>Drag</strong> to look around the hall</li>
          <li><strong>Scroll</strong> to approach or withdraw</li>
          <li><strong>Click a world</strong> &mdash; or its label, or the catalogue &mdash; to walk over and read its plaque</li>
          <li><strong>&uarr; / &darr;</strong> walk the catalogue &middot; <strong>Esc</strong> steps back</li>
        </ul>

        <h3 className="visit__heading">Credits</h3>
        <p className="visit__text visit__text--small">
          Surface maps &copy; Solar System Scope, CC BY 4.0. Planet positions from JPL
          approximate elements (valid 1800&ndash;2050). Orbital pace is compressed so
          distant worlds keep visible motion.
        </p>
      </div>
    </div>
  );
}
