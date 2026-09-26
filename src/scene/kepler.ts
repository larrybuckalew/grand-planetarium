/**
 * Low-precision heliocentric positions of the planets from Keplerian
 * elements (JPL "Approximate Positions of the Planets", valid 1800-2050).
 * Good to a few arcminutes — plenty for placing a stylized orrery.
 */

export interface Elements {
  /** semi-major axis (au) and rate (au/century) */
  a: number;
  aDot: number;
  /** eccentricity and rate */
  e: number;
  eDot: number;
  /** inclination (deg) and rate */
  i: number;
  iDot: number;
  /** mean longitude (deg) and rate */
  L: number;
  LDot: number;
  /** longitude of perihelion (deg) and rate */
  lp: number;
  lpDot: number;
  /** longitude of ascending node (deg) and rate */
  ln: number;
  lnDot: number;
}

const DEG = Math.PI / 180;

export function julianDate(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

function solveKepler(M: number, e: number): number {
  let E = M;
  for (let k = 0; k < 10; k++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-7) break;
  }
  return E;
}

export interface HelioPos {
  /** au, ecliptic frame: x, y in the ecliptic plane, z toward the north */
  x: number;
  y: number;
  z: number;
}

export function helioPosition(el: Elements, date: Date): HelioPos {
  const T = (julianDate(date) - 2451545.0) / 36525;
  const a = el.a + el.aDot * T;
  const e = el.e + el.eDot * T;
  const i = (el.i + el.iDot * T) * DEG;
  const L = el.L + el.LDot * T;
  const lp = el.lp + el.lpDot * T;
  const ln = el.ln + el.lnDot * T;

  const w = (lp - ln) * DEG; // argument of perihelion
  const O = ln * DEG;

  let M = (L - lp) * DEG;
  M = M % (Math.PI * 2);
  if (M > Math.PI) M -= Math.PI * 2;
  if (M < -Math.PI) M += Math.PI * 2;

  const E = solveKepler(M, e);

  // Position in the orbital plane, perihelion along +x'.
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);

  const cw = Math.cos(w);
  const sw = Math.sin(w);
  const cO = Math.cos(O);
  const sO = Math.sin(O);
  const ci = Math.cos(i);
  const si = Math.sin(i);

  return {
    x: (cw * cO - sw * sO * ci) * xp + (-sw * cO - cw * sO * ci) * yp,
    y: (cw * sO + sw * cO * ci) * xp + (-sw * sO + cw * cO * ci) * yp,
    z: sw * si * xp + cw * si * yp,
  };
}

/**
 * Scene mapping. Radial compression (sqrt) keeps the inner planets visible
 * while preserving each world's true direction from the Sun, so the
 * relative configuration of tonight's sky is exact.
 */
export const SCENE_SCALE = 22;

export function scenePosition(pos: HelioPos, out: { x: number; y: number; z: number }): void {
  const r = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z) || 1e-9;
  const k = (SCENE_SCALE * Math.sqrt(r)) / r;
  out.x = pos.x * k;
  out.y = pos.z * k;
  out.z = pos.y * k;
}
