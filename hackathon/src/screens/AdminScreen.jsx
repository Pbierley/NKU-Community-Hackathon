import { useState } from 'react'
import { apiUrl } from '../api'
import { canRemoveAdmins, isDeveloper } from '../auth/accountTypes'
import { getAuthToken } from '../auth/useAuth'

function rolePhrase(accountType) {
  if (accountType === 'developer') return 'a developer'
  if (accountType === 'superadmin') return 'a superadmin'
  return 'an admin'
}

function inviteLabel(role, canPick, busy) {
  if (busy) return 'Inviting…'
  if (canPick && role === 'developer') return 'Invite as developer'
  if (canPick && role === 'superadmin') return 'Invite as superadmin'
  return 'Invite as admin'
}

async function addLocation(body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getAuthToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(apiUrl('/api/buildings'), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

export default function AdminScreen({ onNavigate, user, onInvite, onRemove }) {
  const canInviteDevelopers = isDeveloper(user)
  const canRemove = canRemoveAdmins(user)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('admin')
  const [inviteError, setInviteError] = useState(null)
  const [inviteMessage, setInviteMessage] = useState(null)
  const [inviteBusy, setInviteBusy] = useState(false)
  const [removeEmail, setRemoveEmail] = useState('')
  const [removeError, setRemoveError] = useState(null)
  const [removeMessage, setRemoveMessage] = useState(null)
  const [removeBusy, setRemoveBusy] = useState(false)
  const [name, setName] = useState('')
  const [alias, setAlias] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [parking, setParking] = useState(false)
  const [locationError, setLocationError] = useState(null)
  const [locationMessage, setLocationMessage] = useState(null)
  const [locationBusy, setLocationBusy] = useState(false)

  async function handleInvite(e) {
    e.preventDefault()
    setInviteError(null)
    setInviteMessage(null)
    const nextEmail = email.trim().toLowerCase()
    if (!nextEmail) {
      setInviteError('Enter the email to invite.')
      return
    }
    setInviteBusy(true)
    try {
      const invitedRole = canInviteDevelopers ? role : 'admin'
      const result = await onInvite(nextEmail, invitedRole)
      const phrase = rolePhrase(result.user?.accountType ?? result.accountType ?? invitedRole)
      if (result.status === 'granted') {
        setInviteMessage(`${result.user.email} is now ${phrase}.`)
      } else if (result.status === 'already') {
        setInviteMessage(`${result.user.email} is already ${phrase}.`)
      } else {
        setInviteMessage(`${result.email} will be ${phrase} when they create an account.`)
      }
      setEmail('')
    } catch (err) {
      setInviteError(err.message || 'Could not send the invite.')
    } finally {
      setInviteBusy(false)
    }
  }

  async function handleRemove(e) {
    e.preventDefault()
    setRemoveError(null)
    setRemoveMessage(null)
    const nextEmail = removeEmail.trim().toLowerCase()
    if (!nextEmail) {
      setRemoveError('Enter the email to remove.')
      return
    }
    setRemoveBusy(true)
    try {
      const result = await onRemove(nextEmail)
      setRemoveMessage(result.user
        ? `${result.user.email} is now a basic account.`
        : `The invite for ${result.email} was removed.`)
      setRemoveEmail('')
    } catch (err) {
      setRemoveError(err.message || 'Could not remove that role.')
    } finally {
      setRemoveBusy(false)
    }
  }

  async function handleLocation(e) {
    e.preventDefault()
    setLocationError(null)
    setLocationMessage(null)
    const latitude = Number(lat)
    const longitude = Number(lng)
    if (!name.trim()) {
      setLocationError('Enter a full name.')
      return
    }
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      setLocationError('Enter latitude and longitude as numbers.')
      return
    }
    setLocationBusy(true)
    try {
      const building = await addLocation({
        name: name.trim(),
        alias,
        lat: latitude,
        lng: longitude,
        parking,
      })
      setLocationMessage(`${building.name} is on the campus map.`)
      setName('')
      setAlias('')
      setLat('')
      setLng('')
      setParking(false)
    } catch (err) {
      setLocationError(err.message || 'Could not add the location.')
    } finally {
      setLocationBusy(false)
    }
  }

  return (
    <div className="screen h-full flex flex-col bg-canvas">
      <header className="px-6 pt-4 pb-4 bg-white border-b border-line flex items-center gap-4">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          aria-label="Back"
          className="w-12 h-12 rounded-lg border border-line bg-white flex items-center justify-center shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <div className="flex-1 text-left">
          <h1 className="text-xl font-bold tracking-tight leading-[1.3]">Admin</h1>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-4 sm:p-6 pb-8 space-y-6 text-left flex flex-col items-center">
        <form onSubmit={handleInvite} className="w-full max-w-2xl bg-white border border-line rounded-xl p-6 shadow-card" aria-label="Invite">
          <h2 className="text-xl font-bold tracking-tight leading-[1.3]">Invite</h2>
          <p className="mt-1 text-[14px] text-muted leading-[1.5]">
            {canInviteDevelopers
              ? 'Grant admin, superadmin, or developer access. They get it now if they already have an account, or when they sign up.'
              : 'They become an admin now if they already have an account. Otherwise they become an admin when they sign up.'}
          </p>
          {inviteError && (
            <p role="alert" className="mt-4 bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-4 py-3 text-[14px] font-semibold text-[#B91C1C]">
              {inviteError}
            </p>
          )}
          {inviteMessage && (
            <p role="status" className="mt-4 bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg px-4 py-3 text-[14px] font-semibold text-[#047857]">
              {inviteMessage}
            </p>
          )}
          <div className="mt-4 grid gap-2">
            {canInviteDevelopers && (
              <label className="flex items-center justify-between gap-4 h-14 border border-line rounded-lg px-4 bg-white">
                <span className="text-[11px] font-bold tracking-[0.06em] uppercase text-body">Role:</span>
                <select
                  value={role}
                  onChange={(e) => { setRole(e.target.value); setInviteError(null); setInviteMessage(null) }}
                  aria-label="Role to invite"
                  className="text-[15px] font-medium bg-transparent text-right text-ink"
                >
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                  <option value="developer">Developer</option>
                </select>
              </label>
            )}
            <label className="flex items-center justify-between gap-4 min-h-14 border border-line rounded-lg px-4 bg-white">
              <span className="text-[11px] font-bold tracking-[0.06em] uppercase text-body shrink-0">Email:</span>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setInviteError(null); setInviteMessage(null) }}
                placeholder="name@nku.edu"
                aria-label="Email to invite"
                autoComplete="off"
                className="text-right text-[15px] font-medium bg-transparent w-2/3 text-ink placeholder:text-faint"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={inviteBusy}
            className="mt-4 h-12 px-6 rounded-lg bg-ink text-white font-bold text-[14px] disabled:opacity-60"
          >
            {inviteLabel(role, canInviteDevelopers, inviteBusy)}
          </button>
        </form>

        {canRemove && (
          <form onSubmit={handleRemove} className="w-full max-w-2xl bg-white border border-line rounded-xl p-6 shadow-card" aria-label="Remove a role">
            <h2 className="text-xl font-bold tracking-tight leading-[1.3]">Remove access</h2>
            <p className="mt-1 text-[14px] text-muted leading-[1.5]">
              {canInviteDevelopers
                ? 'Remove an admin, superadmin, or developer. They become a basic account.'
                : 'Remove an admin. They become a basic account.'}
            </p>
            {removeError && (
              <p role="alert" className="mt-4 bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-4 py-3 text-[14px] font-semibold text-[#B91C1C]">
                {removeError}
              </p>
            )}
            {removeMessage && (
              <p role="status" className="mt-4 bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg px-4 py-3 text-[14px] font-semibold text-[#047857]">
                {removeMessage}
              </p>
            )}
            <label className="mt-4 flex items-center justify-between gap-4 min-h-14 border border-line rounded-lg px-4 bg-white">
              <span className="text-[11px] font-bold tracking-[0.06em] uppercase text-body shrink-0">Email:</span>
              <input
                type="email"
                value={removeEmail}
                onChange={(e) => { setRemoveEmail(e.target.value); setRemoveError(null); setRemoveMessage(null) }}
                placeholder="name@nku.edu"
                aria-label="Email to remove"
                autoComplete="off"
                className="text-right text-[15px] font-medium bg-transparent w-2/3 text-ink placeholder:text-faint"
              />
            </label>
            <button
              type="submit"
              disabled={removeBusy}
              className="mt-4 h-12 px-6 rounded-lg bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA] font-bold text-[14px] disabled:opacity-60"
            >
              {removeBusy ? 'Removing…' : 'Remove access'}
            </button>
          </form>
        )}

        <form onSubmit={handleLocation} className="w-full max-w-2xl bg-white border border-line rounded-xl p-6 shadow-card" aria-label="New location">
          <h2 className="text-xl font-bold tracking-tight leading-[1.3]">Add location</h2>
          <p className="mt-1 text-[14px] text-muted leading-[1.5]">
            Adds a building or lot to the campus list. Separate extra names with commas.
          </p>
          {locationError && (
            <p role="alert" className="mt-4 bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-4 py-3 text-[14px] font-semibold text-[#B91C1C]">
              {locationError}
            </p>
          )}
          {locationMessage && (
            <p role="status" className="mt-4 bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg px-4 py-3 text-[14px] font-semibold text-[#047857]">
              {locationMessage}
            </p>
          )}
          <div className="mt-4 grid gap-2">
            <label className="flex items-center justify-between gap-4 min-h-14 bg-white border border-line rounded-lg px-4 py-2">
              <span className="text-[11px] font-bold tracking-[0.06em] uppercase text-body shrink-0">Full name:</span>
              <input
                value={name}
                onChange={(e) => { setName(e.target.value); setLocationMessage(null) }}
                required
                maxLength={120}
                placeholder="Griffin Hall"
                aria-label="Full name"
                className="text-right text-[15px] font-medium leading-[1.6] text-ink w-2/3 bg-transparent placeholder:text-faint"
              />
            </label>
            <label className="flex items-center justify-between gap-4 min-h-14 bg-white border border-line rounded-lg px-4 py-2">
              <span className="text-[11px] font-bold tracking-[0.06em] uppercase text-body shrink-0">Alias:</span>
              <input
                value={alias}
                onChange={(e) => { setAlias(e.target.value); setLocationMessage(null) }}
                placeholder="GH, College of Informatics"
                aria-label="Alias"
                className="text-right text-[15px] font-medium leading-[1.6] text-ink w-2/3 bg-transparent placeholder:text-faint"
              />
            </label>
            <label className="flex items-center justify-between gap-4 min-h-14 bg-white border border-line rounded-lg px-4 py-2">
              <span className="text-[11px] font-bold tracking-[0.06em] uppercase text-body shrink-0">Latitude:</span>
              <input
                value={lat}
                onChange={(e) => { setLat(e.target.value); setLocationMessage(null) }}
                required
                inputMode="decimal"
                placeholder="39.031075"
                aria-label="Latitude"
                className="text-right text-[15px] font-medium leading-[1.6] text-ink w-2/3 bg-transparent placeholder:text-faint"
              />
            </label>
            <label className="flex items-center justify-between gap-4 min-h-14 bg-white border border-line rounded-lg px-4 py-2">
              <span className="text-[11px] font-bold tracking-[0.06em] uppercase text-body shrink-0">Longitude:</span>
              <input
                value={lng}
                onChange={(e) => { setLng(e.target.value); setLocationMessage(null) }}
                required
                inputMode="decimal"
                placeholder="-84.461664"
                aria-label="Longitude"
                className="text-right text-[15px] font-medium leading-[1.6] text-ink w-2/3 bg-transparent placeholder:text-faint"
              />
            </label>
            <label className="flex items-center gap-3 min-h-14 border border-line rounded-lg px-4 bg-white">
              <input
                type="checkbox"
                checked={parking}
                onChange={(e) => { setParking(e.target.checked); setLocationMessage(null) }}
                className="w-4 h-4 accent-ink"
              />
              <span className="text-[15px] font-medium leading-[1.6]">Parking lot</span>
            </label>
          </div>
          <button
            type="submit"
            disabled={locationBusy}
            className="mt-4 h-12 px-6 rounded-lg bg-nku font-bold text-[14px] text-ink disabled:opacity-60"
          >
            {locationBusy ? 'Saving…' : 'Add location'}
          </button>
        </form>
      </main>
    </div>
  )
}
