'use client'

// text-base (16px) on every input is deliberate: iOS Safari zooms the page
// in when you focus an input smaller than 16px, which makes phone forms
// feel broken.
const INPUT = 'w-full rounded border px-3 py-2 text-base'

export function TextField({ label, hint, ...props }) {
  return (
    <label className="block">
      <span className="block text-sm mb-1">{label}</span>
      <input className={INPUT} {...props} />
      {hint && <span className="block text-xs opacity-60 mt-1">{hint}</span>}
    </label>
  )
}

export function TextArea({ label, hint, rows = 6, ...props }) {
  return (
    <label className="block">
      <span className="block text-sm mb-1">{label}</span>
      <textarea className={INPUT} rows={rows} {...props} />
      {hint && <span className="block text-xs opacity-60 mt-1">{hint}</span>}
    </label>
  )
}

export function SelectField({ label, children, hint, ...props }) {
  return (
    <label className="block">
      <span className="block text-sm mb-1">{label}</span>
      <select className={INPUT} {...props}>
        {children}
      </select>
      {hint && <span className="block text-xs opacity-60 mt-1">{hint}</span>}
    </label>
  )
}

export function CheckField({ label, hint, ...props }) {
  return (
    <label className="flex items-start gap-3 py-2">
      <input type="checkbox" className="mt-1 h-5 w-5" {...props} />
      <span>
        <span className="block text-sm">{label}</span>
        {hint && <span className="block text-xs opacity-60">{hint}</span>}
      </span>
    </label>
  )
}
