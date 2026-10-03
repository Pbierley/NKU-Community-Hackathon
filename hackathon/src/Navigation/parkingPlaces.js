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
