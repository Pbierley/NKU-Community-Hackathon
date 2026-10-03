// Lots use a single letter. Garages are named "... Garage".
export function isParkingPlace(building) {
  const name = String(building?.name ?? '')
  return /^Lot [A-Z]$/.test(name) || /Garage$/i.test(name)
}
