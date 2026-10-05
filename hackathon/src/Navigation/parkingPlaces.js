// New locations store an explicit parking flag. Older rows are lots
// named "Lot X" or garages whose name ends in "Garage".
export function isParkingPlace(building) {
  if (typeof building?.parking === 'boolean') return building.parking
  const name = String(building?.name ?? '')
  return /^Lot [A-Z]$/.test(name) || /Garage$/i.test(name)
}

// The recreation center is its own pin, separate from Albright Health Center.
export function isRecreationCenter(building) {
  return String(building?.name ?? '').trim().toLowerCase() === 'campus rec center'
}

// Permit comes from the June 2025 NKU campus map legend.
export function parkingPermitLabel(building) {
  const permit = String(building?.permit ?? '').trim()
  if (!permit) return ''
  const ev = (building.Alias ?? []).some((alias) => /ev charging/i.test(alias))
  const label = `${permit} parking`
  return ev ? `${label} · EV charging` : label
}
