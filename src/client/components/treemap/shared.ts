import type { Module } from './interface'

export function sortChildrenBySize(a: Module, b: Module) {
  return b.size - a.size || +(a.id > b.id) - +(a.id < b.id)
}

export function assignColorMaapings(hueAngle: number) {
  const saturation = 0.6 + 0.4 * Math.max(0, Math.cos(hueAngle))
  const lightness = 0.5 + 0.2 * Math.max(0, Math.cos(hueAngle + Math.PI * 2 / 3))
  return 'hsl(' + hueAngle * 180 / Math.PI + 'deg, ' + Math.round(100 * saturation) + '%, ' + Math.round(100 * lightness) + '%)'
}
