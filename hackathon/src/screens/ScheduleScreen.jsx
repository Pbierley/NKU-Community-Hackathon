import { useState } from 'react'
import AppHeader from '../components/AppHeader'
import { findBuildingForLocation, useBuildings } from '../Navigation/buildings'

const EXAMPLE = `Fall 2026
CSC 402-001 Advanced Programming Methods
MW 2:00 pm - 3:15 pm
Griffin Hall 250

ASE 456-001 Cross-Platform Development
TR 11:00 am - 12:15 pm
GH 310`

function classLine(item) {
  return [item.days, item.time].filter(Boolean).join(' · ')
}

function buildingIdFor(item, buildings) {
  if (Number.isFinite(item?.buildingId)) return item.buildingId
  const match = findBuildingForLocation(buildings, item?.location || item?.buildingName)
  return match?.id ?? null
}

export default function ScheduleScreen({ onNavigate, user, onUpload, onShowOnMap }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)
  const { buildings } = useBuildings()
  const semesters = Array.isArray(user?.semesters) ? user.semesters : []

  async function onFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      const name = file.name.toLowerCase()
      const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf')
      if (isPdf) {
        const bytes = new Uint8Array(await file.arrayBuffer())
        let binary = ''
        for (let i = 0; i < bytes.length; i += 0x8000) {
          binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
        }
        await onUpload({ pdf: btoa(binary), filename: file.name })
      } else {
        await onUpload({ text: await file.text(), filename: file.name })
      }
      setSaved(true)
    } catch (err) {
      setError(err.message || 'Could not read that schedule.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="screen h-full flex flex-col bg-canvas">
      <AppHeader onNavigate={onNavigate} />
      <main className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 text-left">
        <div className="w-full max-w-2xl mx-auto">
          <h1 className="text-xl font-bold tracking-tight leading-[1.3]">Upload Schedule</h1>
          <p className="mt-1 text-[14px] text-muted leading-[1.5]">
            Upload the PDF of your class schedule. Each class is saved on your account under its semester, including the building when the file has one.
          </p>

          <label className="mt-4 flex items-center justify-center h-12 px-4 rounded-md bg-nku font-bold text-[14px] text-ink cursor-pointer">
            {busy ? 'Reading schedule…' : 'Choose a schedule PDF'}
            <input
              type="file"
              accept=".pdf,application/pdf,.csv,.ics,.ical,.txt,text/plain,text/calendar"
              className="sr-only"
              disabled={busy}
              onChange={onFile}
            />
          </label>

          {error && <p className="mt-4 text-[14px] text-body">{error}</p>}
          {saved && <p className="mt-4 text-[14px] text-body">Schedule saved.</p>}

          <section className="mt-6">
            <h2 className="text-[15px] font-bold leading-[1.5]">Example</h2>
            <pre className="mt-2 whitespace-pre-wrap bg-white border border-line rounded-xl px-4 py-3 text-[13px] leading-[1.5] text-ink">{EXAMPLE}</pre>
          </section>

          {semesters.length === 0 && (
            <p className="mt-6 text-[15px] text-muted">No schedule saved yet.</p>
          )}

          {semesters.map((semester) => (
            <section key={semester.name} className="mt-6">
              <h2 className="text-[15px] font-bold leading-[1.5]">{semester.name}</h2>
              <ul className="mt-3 space-y-2">
                {semester.classes.map((item) => {
                  const buildingId = buildingIdFor(item, buildings)
                  return (
                  <li key={`${item.code}|${item.location}`} className="bg-white border border-line rounded-xl px-4 py-3 shadow-card">
                    <span className="block text-[15px] font-semibold leading-[1.5]">
                      {item.code}{item.title ? ` ${item.title}` : ''}
                    </span>
                    {classLine(item) && (
                      <span className="block text-[13px] text-muted leading-[1.4]">{classLine(item)}</span>
                    )}
                    {buildingId != null ? (
                      <button
                        type="button"
                        onClick={() => onShowOnMap(buildingId)}
                        aria-label={`Route to ${item.buildingName || item.location}`}
                        className="mt-1 block text-left text-[13px] font-semibold leading-[1.4] text-ink underline"
                      >
                        {item.location || item.buildingName}
                      </button>
                    ) : (
                      <span className="block text-[13px] text-ink leading-[1.4]">
                        {item.location || 'No location in the file'}
                      </span>
                    )}
                  </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}
