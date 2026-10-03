const SIZES = { sm: 'h-10', lg: 'h-16' }

export default function LogoButton({ onClick, size = 'sm', className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="NKU — go to home"
      className={`rounded-lg shrink-0 ${className}`}
    >
      <img
        src="/logo.avif"
        alt="Northern Kentucky University logo"
        className={`${SIZES[size]} w-auto rounded-lg`}
      />
    </button>
  )
}
