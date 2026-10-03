import { useState } from 'react'

const INTEREST_PALETTE = [
  'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]',
  'bg-[#F5F3FF] text-[#5B21B6] border-[#DDD6FE]',
  'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]',
  'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]',
  'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]',
  'bg-[#FDF4FF] text-[#A21CAF] border-[#F0ABFC]',
]

// Shared interests picker used by registration and account editing:
// toggle preselected chips, add unlimited custom tags, remove custom tags.
export default function InterestsEditor({ interests, onToggle, onAdd, onRemove }) {
  const [custom, setCustom] = useState('')
  const selectedCount = interests.filter((i) => i.on).length

  function submit() {
    const cleaned = custom.trim().replace(/[✓+×]/g, '').trim()
    if (!cleaned) return
    const label = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
    onAdd(label)
    setCustom('')
  }

  return (
    <div className="border border-line rounded-lg p-4">
      <p className="text-[11px] font-bold tracking-[0.06em] uppercase text-body">
        Interests selected: <span className="tnum">{selectedCount}</span>
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {interests.map((item, idx) => (
          <span key={item.name} className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => onToggle(idx)}
              aria-pressed={item.on}
              className={`text-[12px] font-semibold rounded-md px-3 py-2 border ${
                item.on
                  ? INTEREST_PALETTE[idx % INTEREST_PALETTE.length]
                  : 'bg-wash text-body border-line'
              }`}
            >
              {item.name} {item.on ? '✓' : '+'}
            </button>
            {item.custom && (
              <button
                type="button"
                onClick={() => onRemove(idx)}
                aria-label={`Remove ${item.name}`}
                className="w-7 h-7 rounded-md text-muted hover:bg-wash flex items-center justify-center text-[14px] font-bold"
              >
                ×
              </button>
            )}
          </span>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submit()
            }
          }}
          type="text"
          placeholder="Type an interest, e.g. Chess"
          maxLength={40}
          aria-label="Add a custom interest"
          className="h-12 px-4 flex-1 min-w-0 bg-white border border-line rounded-lg text-[15px] leading-[1.6] text-ink placeholder:text-faint"
        />
        <button
          type="button"
          onClick={submit}
          className="h-12 px-4 rounded-lg bg-ink text-white font-semibold text-[14px] shrink-0"
        >
          Add
        </button>
      </div>
      <p className="mt-2 text-[12px] text-muted leading-[1.5]">
        Add as many as you like — custom interests are saved with your profile.
      </p>
    </div>
  )
}
