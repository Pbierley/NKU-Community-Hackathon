import { useEffect, useState } from 'react'
import { useBuildings } from '../Navigation/buildings'

function isImageUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function toDateInput(value) {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toTimeInput(value) {
  if (!value) return ''
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return value
  const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return ''
  let hours = Number(match[1]) % 12
  if (match[3].toUpperCase() === 'PM') hours += 12
  return `${String(hours).padStart(2, '0')}:${match[2]}`
}

export default function EventModal({ isOpen, onClose, onPost, onUpdate, eventToEdit = null }) {
  const { buildings } = useBuildings()
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [tags, setTags] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [existingImages, setExistingImages] = useState([])
  const [imageError, setImageError] = useState('')
  const [isLocationOpen, setIsLocationOpen] = useState(false)
  const isEditing = Boolean(eventToEdit)

  useEffect(() => {
    if (!isOpen) return
    setName(eventToEdit?.title ?? '')
    setLocation(eventToEdit?.location ?? '')
    setDescription(eventToEdit?.description ?? '')
    setDate(toDateInput(eventToEdit?.date))
    const [start = '', end = ''] = (eventToEdit?.time ?? '').split(/\s+-\s+/)
    setStartTime(toTimeInput(start))
    setEndTime(toTimeInput(end))
    setTags((eventToEdit?.tags ?? []).join(', '))
    setImageUrl('')
    setExistingImages(eventToEdit?.images ?? [])
    setImageError('')
    setIsLocationOpen(false)
  }, [isOpen, eventToEdit])

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
    setDate('')
    setStartTime('')
    setEndTime('')
    setTags('')
    setImageUrl('')
    setExistingImages([])
    setImageError('')
    setIsLocationOpen(false)
  }

  function handlePost(event) {
    event.preventDefault()
    if (!name.trim() || !location.trim() || !description.trim() || !date || !startTime || !endTime || !tags.trim()) return
    const trimmedImageUrl = imageUrl.trim()
    if (trimmedImageUrl && !isImageUrl(trimmedImageUrl)) {
      setImageError('Enter a valid image URL beginning with http:// or https://.')
      return
    }

    const formattedDate = new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    const formatTime = (value) => new Date(`1970-01-01T${value}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })

    const updatedEvent = {
      ...(eventToEdit ?? {}),
      id: eventToEdit?.id ?? `event-${Date.now()}`,
      title: name.trim(),
      location: location.trim(),
      description: description.trim(),
      date: formattedDate,
      time: `${formatTime(startTime)} - ${formatTime(endTime)}`,
      tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      images: trimmedImageUrl ? [...existingImages, trimmedImageUrl] : existingImages,
    }
    if (isEditing) onUpdate(updatedEvent)
    else onPost(updatedEvent)
    reset()
  }

  function addImageUrl() {
    const trimmedImageUrl = imageUrl.trim()
    if (!trimmedImageUrl) return
    if (!isImageUrl(trimmedImageUrl)) {
      setImageError('Enter a valid image URL beginning with http:// or https://.')
      return
    }
    setExistingImages((current) => current.includes(trimmedImageUrl) ? current : [...current, trimmedImageUrl])
    setImageUrl('')
    setImageError('')
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
          <h2 className="text-xl font-bold tracking-tight leading-[1.3]">
            {isEditing ? 'Edit event' : 'Make a post'}
          </h2>
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

        <form className="mt-6" onSubmit={handlePost}>
          <div className="space-y-4">
          <div>
            <label htmlFor="event-name" className="text-[11px] font-bold tracking-[0.06em] uppercase text-body">
              Event name <span aria-hidden="true">*</span>
            </label>
            <input
              id="event-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What's the event?"
              className="field mt-2 w-full h-14 px-4 rounded-lg bg-white border border-line text-[15px] text-ink leading-[1.6] placeholder:text-faint"
            />
          </div>

          <div>
            <label htmlFor="event-location" className="text-[11px] font-bold tracking-[0.06em] uppercase text-body">
              Location <span aria-hidden="true">*</span>
            </label>
            <div className="relative mt-2">
              <input
                id="event-location"
                type="text"
                required
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
              Description <span aria-hidden="true">*</span>
            </label>
            <textarea
              id="event-description"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell people about the event..."
              rows="4"
              className="field mt-2 w-full px-4 py-3 rounded-lg bg-white border border-line text-[15px] text-ink leading-[1.6] placeholder:text-faint"
            />
          </div>

          <div>
            <label htmlFor="event-date" className="text-[11px] font-bold tracking-[0.06em] uppercase text-body">
              Date <span aria-hidden="true">*</span>
            </label>
            <input
              id="event-date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="field mt-2 w-full h-14 px-4 rounded-lg bg-white border border-line text-[15px] text-ink leading-[1.6]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="event-start-time" className="text-[11px] font-bold tracking-[0.06em] uppercase text-body">
                Start time <span aria-hidden="true">*</span>
              </label>
              <input
                id="event-start-time"
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="field mt-2 w-full h-14 px-4 rounded-lg bg-white border border-line text-[15px] text-ink leading-[1.6]"
              />
            </div>
            <div>
              <label htmlFor="event-end-time" className="text-[11px] font-bold tracking-[0.06em] uppercase text-body">
                End time <span aria-hidden="true">*</span>
              </label>
              <input
                id="event-end-time"
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="field mt-2 w-full h-14 px-4 rounded-lg bg-white border border-line text-[15px] text-ink leading-[1.6]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="event-tags" className="text-[11px] font-bold tracking-[0.06em] uppercase text-body">
              Tags <span aria-hidden="true">*</span>
            </label>
            <input
              id="event-tags"
              type="text"
              required
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Social, Games, Free Food"
              className="field mt-2 w-full h-14 px-4 rounded-lg bg-white border border-line text-[15px] text-ink leading-[1.6] placeholder:text-faint"
            />
            <p className="mt-1 text-[12px] text-muted">Separate tags with commas.</p>
          </div>

          <div className="border border-line rounded-lg p-4">
            <p className="text-[11px] font-bold tracking-[0.06em] uppercase text-body">Images</p>
            <div className="mt-3 flex gap-2">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value)
                  setImageError('')
                }}
                placeholder="https://example.com/event-photo.jpg"
                aria-label="Image URL"
                className="field h-12 min-w-0 flex-1 px-3 rounded-lg bg-white border border-line text-[14px] text-ink placeholder:text-faint"
              />
              <button
                type="button"
                onClick={addImageUrl}
                className="h-12 shrink-0 rounded-lg bg-wash px-4 text-ink font-semibold text-[14px]"
              >
                Add URL
              </button>
            </div>
            <p className="mt-2 text-[12px] text-muted">Use a direct link to an image.</p>
            {imageError && <p className="mt-3 text-[13px] text-red-700" role="alert">{imageError}</p>}
            {existingImages.length > 0 && (
              <ul className="mt-4 space-y-2 text-[13px] text-muted leading-[1.5]">
                {existingImages.map((image, index) => (
                  <li key={`${image}-${index}`} className="flex items-center gap-3">
                    <img
                      src={image}
                      alt={`Event image ${index + 1} preview`}
                      className="h-12 w-16 shrink-0 rounded border border-line object-cover"
                    />
                    <span className="min-w-0 flex-1 truncate">{image}</span>
                    <button
                      type="button"
                      onClick={() => setExistingImages((current) => current.filter((_, imageIndex) => imageIndex !== index))}
                      aria-label={`Remove image ${image}`}
                      className="shrink-0 text-body underline"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          </div>

          <div className="mt-8 space-y-4">
            <button
              type="submit"
              className="w-full h-14 px-8 rounded-lg bg-nku hover:bg-nkuDeep font-bold text-[15px] text-ink shadow-card"
            >
              {isEditing ? 'Save changes' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
