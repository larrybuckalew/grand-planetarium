# The Grand Planetarium

A walking tour of eight worlds — plus Pluto. An interactive, cinematic 3D solar system you can orbit, explore, and read like a museum.

The Grand Planetarium is a WebGL exhibition of the Sun and the nine worlds of our solar system, built with React, TypeScript, and three.js. Every planet is rendered with real NASA-derived surface imagery, placed where it truly is **tonight** — computed from JPL's approximate Keplerian elements for the live date — and accompanied by its own museum plaque with a story, statistics, and a notable fact.

## Features

- **Interactive 3D solar system** — drag to orbit the hall, scroll to approach. Real surface maps for every world, a glowing textured Sun, Saturn's rings with the Cassini division, and a Milky Way backdrop with a 2,600-star field.
- **Tonight's real sky** — each planet sits at its true current direction from the Sun, solved from JPL approximate elements (valid 1800–2050). Distances are compressed so the inner system stays in view; directions are exact. The overture tells you which date the hall is arranged for.
- **Camera fly-to with orbit follow** — click any world (in space, on its floating label, or in the catalogue) and the camera glides over to it, then rides along its orbit until you step back.
- **Museum plaques** — every world has its own exhibit card: name, roman numeral, kind, tagline, a short story, quick stats (distance, diameter, year, day, moons), and a "N.B." highlight fact.
- **Moons** — Earth's Moon (textured), Jupiter's four Galilean moons (Io, Europa, Ganymede, Callisto), and Saturn's Titan circle their planets.
- **Asteroid belt** — 1,200 drifting rocks between Mars and Jupiter, toggleable.
- **Cinematic loading curtain** — a "Hanging the exhibits…" screen with live progress while the texture maps stream in.
- **Guided controls** — pause/resume, orbital pace 0–4×, and toggles for orbit lines, the asteroid belt, and labels.
- **Keyboard navigation** — arrow keys walk the catalogue (the camera follows), `Esc` steps back or closes a dialog.
- **Visit modal** — a gallery etiquette guide with usage instructions and credits.

## The worlds

The Sun · Mercury · Venus · Earth (with the Moon) · Mars · Jupiter (with Io, Europa, Ganymede, Callisto) · Saturn (with Titan) · Uranus · Neptune · Pluto — kept in the exhibition out of affection, reclassified in 2006.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
```

Other scripts:

```bash
npm run build    # production build to dist/
npm run preview  # serve the production build locally
```

## Tech

- React 19 + TypeScript + Vite 6 (Tailwind CSS v4 via `@tailwindcss/vite`)
- three.js rendered imperatively for full control of the scene graph, camera choreography, and custom shaders (atmospheric rim glow)
- Keplerian orbit solver (`src/scene/kepler.ts`) — Kepler's equation solved by Newton iteration, mapped to the scene with radially compressed distances
- Procedural canvas textures as instant fallbacks while real maps load
- UnrealBloom post-processing (code-split, loaded async) for the Sun's glow
- Dynamic labels: HTML elements projected from 3D world positions each frame

## Deployments

- **GitHub Pages** — a GitHub Actions workflow (`.github/workflows/deploy.yml`) builds and deploys on every push to `main`. Live at [larrybuckalew.github.io/grand-planetarium](https://larrybuckalew.github.io/grand-planetarium/).
- **Verdent hosting** — the `.verdentc.json` manifest makes the project one-click publishable from the Verdent desktop app.

## Credits

- Surface maps © [Solar System Scope](https://www.solarsystemscope.com/textures/), CC BY 4.0
- Planet positions computed from JPL approximate Keplerian elements

## License

Imagery licensed CC BY 4.0 by Solar System Scope. Code: MIT.
