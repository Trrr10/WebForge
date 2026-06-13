/**
 * theme.js
 * Shared design tokens for DeskGuard's "reading room" visual identity.
 * Import these instead of hardcoding colors so the whole app stays consistent.
 */

export const STATUS = {
  free:      { fill: '#6FBF73', stroke: '#4F9C54', label: 'Free' },
  occupied:  { fill: '#E0675C', stroke: '#C1453B', label: 'Occupied' },
  away:      { fill: '#E8C26B', stroke: '#CAA23F', label: 'Away' },
  abandoned: { fill: '#E2935B', stroke: '#C4713A', label: 'Abandoned' },
}

export const PALETTE = {
  bg:         '#152019',
  surface:    '#1F2F27',
  surfaceAlt: '#28392F',
  card:       '#2E443A',
  wood:       '#5B3A24',
  woodDark:   '#3F2817',
  parchment:  '#F3EFE6',
  muted:      '#9CB3A6',
  accent:     '#D4A24E',
  accentDim:  'rgba(212,162,78,0.18)',
}