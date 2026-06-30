import React from 'react';

/**
 * Ticano logo — official brand artwork.
 *
 * The mark is three swirling blades (one red leading, two gray) arranged
 * around a circular negative space. The full lockup adds the custom "TICANO"
 * wordmark, whose tall "N" ascender reaches up beside the mark.
 *
 * Colors match the official brand SVG exactly:
 *   gray = #808686
 *   red  = #CE313C
 *
 * Props:
 *   size         — pixel height of the MARK (kept consistent in both modes)
 *   animate      — 'spin-in' plays a one-time entrance, then rests
 *   withWordmark — render the full mark + "TICANO" lockup
 *   gray / red   — override brand colors (e.g. white mark on dark surfaces)
 *   className
 */

const MARK_VIEWBOX = '10264.53 588.28 7142.53 7060.01';
const FULL_VIEWBOX = '0 0 26635.5 12855.2';
const FULL_H_RATIO = 12855.2 / 7060.01;
const FULL_W_RATIO = 26635.5 / 7060.01;

// Official brand colors from the master SVG
export const TICANO_GRAY = '#808686';
export const TICANO_RED = '#CE313C';

export default function Logo({
  size = 36,
  animate = false,
  withWordmark = false,
  gray = TICANO_GRAY,
  red = TICANO_RED,
  className = '',
}) {
  const spin = animate === 'spin-in' ? 'ticano-mark-spin' : '';

  const mark = (
    <>
      <path fill={gray} d="M16173.28 6233.98c-2326.03,1966.51 -4249.68,1617.19 -5139.73,555.02 -890.05,-1062.19 247.82,-2575.55 1674.71,-977.87 1137.61,1273.77 2813.95,607.66 3465.02,422.85z" />
      <path fill={red} d="M14460.87 639.19c2777.83,1240.61 3307.26,3131.37 2746.38,4400.4 -560.89,1269.02 -2413.15,903.47 -1608.07,-1084.94 641.85,-1585.29 -687.96,-2808.17 -1138.31,-3315.46z" />
      <path fill={gray} d="M10303.5 5161.71c-291.24,-3040.37 1086.76,-4433.51 2462.28,-4566.99 1375.52,-133.47 1969.79,1666.77 -149.21,1940.44 -1689.4,218.2 -2094.99,1983.05 -2313.07,2626.55z" />
    </>
  );

  const wordmark = (
    <>
      <polygon fill={gray} points="2359.33,12845.89 2359.33,7934.56 32.21,7934.56 32.21,7438.46 5180.17,7438.46 5180.17,7934.56 2853.06,7934.56 2853.06,12845.89 " />
      <rect fill={gray} transform="matrix(2.63583E-14 -0.814546 0.746433 1.61798E-14 4686.17 12852.5)" width="5172.61" height="661.46" />
      <line stroke="#373435" strokeWidth="20" strokeMiterlimit="22.9256" x1="10603.69" y1="9793.75" x2="10993.49" y2="9482.52" />
      <line stroke="#373435" strokeWidth="20" strokeMiterlimit="22.9256" x1="10722.19" y1="11456.09" x2="11091.84" y2="11798.19" />
      <path fill={gray} d="M6808.59 10703.25c0,-900.63 928.41,-1630.74 2073.66,-1630.74 717.01,0 1349.05,286.19 1721.44,721.24l389.8 -311.23c-465.29,-551.79 -1237.42,-912.71 -2111.24,-912.71 -1421.57,0 -2573.98,955.18 -2573.98,2133.45 0,1178.27 1152.41,2133.45 2573.98,2133.45 938.61,0 1759.89,-416.42 2209.59,-1038.52l-369.65 -342.1c-345.88,521.71 -1040.01,877.91 -1839.94,877.91 -1145.25,0 -2073.66,-730.11 -2073.66,-1630.75z" />
      <path fill={gray} d="M21392.83 10708.73c0,1150.9 1152.41,2083.88 2573.98,2083.88 1421.56,0 2573.97,-932.98 2573.97,-2083.88 0,-1150.9 -1152.41,-2083.88 -2573.97,-2083.88 -1421.57,0 -2573.98,932.98 -2573.98,2083.88zm2573.98 1581.17c-1145.25,0 -2073.66,-707.92 -2073.66,-1581.17 0,-873.26 928.41,-1581.18 2073.66,-1581.18 1145.24,0 2073.66,707.92 2073.66,1581.18 0,873.25 -928.42,1581.17 -2073.66,1581.17z" />
      <path fill={gray} d="M12938.8 11231.39l926.31 -1832.05 924.12 1828.33 -1850.43 3.72zm3225.27 1621.08l-2164.62 -4282.66 -268.7 0 -2165.4 4282.66 553.8 0 621.17 -1228.54 2246.91 -4.52 623.25 1233.06 553.59 0z" />
      <polygon fill={gray} points="16863.02,8639.14 16863.02,12852.47 17356.75,12852.47 17356.75,9700.09 20105.22,12852.47 20352.09,12852.47 20352.09,-2.72 19858.35,-2.72 19858.35,11801.21 17109.88,8639.14 " />
    </>
  );

  if (withWordmark) {
    return (
      <svg
        width={size * FULL_W_RATIO}
        height={size * FULL_H_RATIO}
        viewBox={FULL_VIEWBOX}
        className={`${spin} ${className}`}
        style={{ display: 'block' }}
        aria-label="Ticano"
        role="img"
      >
        {mark}
        {wordmark}
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={MARK_VIEWBOX}
      className={`${spin} ${className}`}
      style={{ display: 'block' }}
      aria-label="Ticano"
      role="img"
    >
      {mark}
    </svg>
  );
}
