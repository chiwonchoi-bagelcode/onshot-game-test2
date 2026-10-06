// World units: roughly 1 unit = 25cm, but props are chunky/stylised so they read on a phone.
export const GRAVITY = -24;
export const STEP = 1 / 60;
export const MAX_STEPS_PER_FRAME = 3;

/** How high (world y) the cat's paw can reach with a leap. */
export const REACH = 4.7;

/** Swat tuning: delta-v = VMAX * power * min(1, MREF / mass) */
export const PAW = { vmax: 9.5, mref: 1.6, lift: 0.16, minPower: 0.3 };

/** Gravity-compensated delta-v per step that counts as an impact. */
export const SOUND_MIN_IMPACT = 1.4;

export const G = {
  STATIC: 1,
  PROP: 2,
  FRAG: 4,
  INVIS: 8,
  NOCOLL: 16,
} as const;

export function groups(member: number, filter: number): number {
  return ((member & 0xffff) << 16) | (filter & 0xffff);
}

export const GROUPS = {
  static: groups(G.STATIC, G.PROP | G.FRAG),
  prop: groups(G.PROP, G.STATIC | G.PROP | G.FRAG | G.INVIS),
  frag: groups(G.FRAG, G.STATIC | G.PROP | G.INVIS),
  invis: groups(G.INVIS, G.PROP | G.FRAG),
  none: groups(G.NOCOLL, 0),
};
