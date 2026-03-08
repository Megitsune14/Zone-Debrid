/**
 * Quality ranking system for video releases (movies, series, anime).
 * Qualities are ordered from worst to best. Used for sorting and visual bars.
 */
export const QUALITY_RANK = [
  'CAM',
  'TS',
  'TC',
  'SCR',
  'R5',
  'DVDSCR',
  'DVD',
  'DVD_RIP',
  'HDTV',
  'WEBRIP',
  'WEB_DL',
  'HDRIP',
  'NORMAL',
  'HD',
  '720P',
  '1080P',
  'FHD',
  'BLURAY',
  'BLURAY_REMUX',
  'UHD',
  '2160P',
  '4K',
  '4K_UHD',
  '4K_HDR',
  'DOLBY_VISION'
] as const

/**
 * Returns the rank index of a quality (0 = worst, higher = better).
 * Unknown qualities are matched to the best containing known quality (e.g. "4K_UHD_HDR" → 4K_UHD).
 */
export function getQualityRank (quality: string): number {
  const normalized = quality.toUpperCase().replace(/\s+/g, '_')
  const exact = QUALITY_RANK.indexOf(normalized as typeof QUALITY_RANK[number])
  if (exact !== -1) return exact
  let best = -1
  for (let i = 0; i < QUALITY_RANK.length; i++) {
    if (normalized.includes(QUALITY_RANK[i])) best = i
  }
  return best === -1 ? 0 : best
}

/**
 * Sorts qualities from worst to best (mutates and returns the array).
 * Use a copy if you need to keep the original order: sortQualities([...arr])
 */
export function sortQualities (qualities: string[]): string[] {
  return qualities.sort((a, b) => getQualityRank(a) - getQualityRank(b))
}

/**
 * Returns a level from 1 (worst) to 5 (best) for the quality bar.
 * Thresholds chosen so NORMAL and HD are not on the same level.
 */
export function getQualityLevel (quality: string): number {
  const rank = getQualityRank(quality)
  if (rank <= 5) return 1   // CAM..R5
  if (rank <= 11) return 2  // DVDSCR..HDRIP
  if (rank <= 12) return 3  // NORMAL
  if (rank <= 16) return 4  // HD..BLURAY
  return 5                   // BLURAY_REMUX..DOLBY_VISION
}

/**
 * Returns a 5-character visual bar (▰ filled, ▱ empty) for the given quality.
 * Example: getQualityBar('HD') → '▰▰▰▱▱'
 */
export function getQualityBar (quality: string): string {
  const level = getQualityLevel(quality)
  return '▰'.repeat(level) + '▱'.repeat(5 - level)
}
