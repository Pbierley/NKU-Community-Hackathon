export default function CampusRoleFields({ value, onChange }) {
  function choose(role) {
    onChange(value === role ? '' : role)
  }

  return (
    <fieldset className="border border-line rounded-lg px-4 py-3">
      <legend className="px-1 text-[11px] font-bold tracking-[0.06em] uppercase text-body">NKU role</legend>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex items-center gap-2 min-h-10 text-[15px] font-medium text-ink">
          <input
            type="checkbox"
            checked={value === 'student'}
            onChange={() => choose('student')}
          />
          Student
        </label>
        <label className="flex items-center gap-2 min-h-10 text-[15px] font-medium text-ink">
          <input
            type="checkbox"
            checked={value === 'staff'}
            onChange={() => choose('staff')}
          />
          Staff
        </label>
      </div>
    </fieldset>
  )
}
