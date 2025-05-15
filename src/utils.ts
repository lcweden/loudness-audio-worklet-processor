/**
 * Calculates the LUFS (Loudness Units relative to Full Scale) value from a given energy value.
 *
 * @param energy - The input energy value.
 * @returns The calculated LUFS value.
 */
function calculateLufs(energy: number): number {
  return -0.691 + 10 * Math.log10(Math.max(energy, Number.EPSILON));
}

export { calculateLufs };
