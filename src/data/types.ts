import type { Elements } from '@/scene/kepler';

export type PlanetId =
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'pluto';

export interface PlanetStat {
  label: string;
  value: string;
}

export interface MoonConfig {
  name: string;
  size: number;
  /** Orbit radius in scene units, from the planet's center. */
  dist: number;
  /** Angular speed at 1x pace (rad/s). */
  speed: number;
  color: string;
  /** Optional texture file in /textures. */
  texture?: string;
}

export interface Planet {
  id: PlanetId;
  name: string;
  numeral: string;
  kind: 'Rocky world' | 'Gas giant' | 'Ice giant' | 'Dwarf planet';
  tagline: string;
  description: string;
  feature: string;
  /** JPL approximate Keplerian elements — drives tonight's real position. */
  elements: Elements;
  /** Scaled planet radius in scene units. */
  size: number;
  /**
   * Orbital angular speed at 1x, real ratios compressed by ^0.65 so the
   * outer worlds still visibly move. Earth = 1.
   */
  orbitSpeed: number;
  /** Axial spin speed, relative. */
  spinSpeed: number;
  /** Base surface color for the procedural fallback texture. */
  color: string;
  /** Accent color used in bands / surface detail. */
  accentColor: string;
  /** Real axial tilt in degrees. */
  tilt: number;
  /** Filename (in /textures) of the real surface map. */
  texture: string;
  /** Hex color of an atmospheric rim glow, if any. */
  atmosphere?: string;
  /** Moons rendered alongside the planet. */
  moons?: MoonConfig[];
  /** True if the planet has rings. */
  rings?: boolean;
  stats: PlanetStat[];
}
