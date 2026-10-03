import { useRef, useState } from 'react'
import { useBuildings } from '../Navigation/buildings'

export default function EventModal({ isOpen, onClose, onPost }) {
  const fileInputRef = useRef(null)
  const { buildings } = useBuildings()
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [isLocationOpen, setIsLocationOpen] = useState(false)

  if (!isOpen) return null

  const matches = buildings.filter((building) => {
    const search = location.toLowerCase()
    if (!search) return false
    return (
      building.name.toLowerCase().includes(search) ||
      building.Alias.some((alias) => alias.toLowerCase().includes(search))
    )
  })

  function reset() {
    setName('')
    setLocation('')
    setDescription('')
    setSelectedFiles([])
    setIsLocationOpen(false)
  }

  function handlePost() {
    if (!name.trim() || !location.trim()) return
    onPost({
      id: `event-${Date.now()}`,
      title: name.trim(),
      location: location.trim(),
      description: description.trim(),
      date: 'Upcoming',
      time: '',
      tags: ['Campus'],
      images: selectedFiles.map((file) => file.name),
    })
    reset()
  }

  return (
    <div className="absolute inset-0 z-[70] flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(17,24,39,0.45)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      />
      <div className="relative w-full max-h-[90%] overflow-y-auto no-scrollbar bg-white border border-line rounded-t-xl sm:rounded-xl p-6 shadow-card text-left">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold tracking-tight leading-[1.3]">Make a post</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-12 h-12 rounded-lg border border-line bg-white flex items-center justify-center"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="event-name" className="text-[11px] font-bold tracking-[0.06em] uppercase text-body">
              Event name
            </label>
            <input
              id="event-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What's the event?"
              className="field mt-2 w-full h-14 px-4 rounded-lg bg-white border border-line text-[15px] text-ink leading-[1.6] placeholder:text-faint"
            />
          </div>

          <div>
            <label htmlFor="event-location" className="text-[11px] font-bold tracking-[0.06em] uppercase text-body">
              Location
            </label>
            <div className="relative mt-2">
              <input
                id="event-location"
                type="text"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value)
                  setIsLocationOpen(true)
                }}
                onFocus={() => setIsLocationOpen(true)}
                placeholder="Search for a building..."
                autoComplete="off"
                className="field w-full h-14 px-4 rounded-lg bg-white border border-line text-[15px] text-ink leading-[1.6] placeholder:text-faint"
              />
              {isLocationOpen && location.trim() && (
                <div className="absolute inset-x-0 top-full mt-2 max-h-48 overflow-y-auto no-scrollbar bg-white border border-line rounded-lg p-2 shadow-card z-10">
                  {matches.length === 0 && (
                    <p className="px-4 py-2 text-[15px] text-muted leading-[1.6]">No buildings found</p>
                  )}
                  {matches.map((building) => (
                    <button
                      key={building.id}
                      type="button"
                      className="w-full flex flex-col items-start gap-1 px-4 py-2 rounded-md hover:bg-canvas text-left"
                      onClick={() => {
                        setLocation(building.name)
                        setIsLocationOpen(false)
                      }}
                    >
                      <span className="text-[15px] font-semibold leading-[1.6] text-ink">{building.name}</span>
                      {building.Alias.length > 0 && (
                        <span className="text-[13px] text-muted leading-[1.5]">{building.Alias.join(', ')}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="event-description" className="text-[11px] font-bold tracking-[0.06em] uppercase text-body">
              Description
            </label>
            <textarea
              id="event-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell people about the event..."
              rows="4"
              className="field mt-2 w-full px-4 py-3 rounded-lg bg-white border border-line text-[15px] text-ink leading-[1.6] placeholder:text-faint"
            />
          </div>

          <div className="border border-line rounded-lg p-4">
            <p className="text-[11px] font-bold tracking-[0.06em] uppercase text-body">Files</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 h-12 px-4 rounded-lg bg-wash text-ink font-semibold text-[14px]"
            >
              Choose files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
            />
            {selectedFiles.length > 0 && (
              <ul className="mt-4 space-y-2 text-[13px] text-muted leading-[1.5]">
                {selectedFiles.map((file) => (
                  <li key={`${file.name}-${file.size}-${file.lastModified}`}>{file.name}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <button
            type="button"
            onClick={handlePost}
            className="w-full h-14 px-8 rounded-lg bg-nku hover:bg-nkuDeep font-bold text-[15px] text-ink shadow-card"
          >
            Post
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full text-left text-[14px] font-semibold text-ink underline underline-offset-2"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
