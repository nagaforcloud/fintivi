import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

interface BaseFieldProps {
  id: string
  label: string
  error?: string
  hint?: string
}

export function TextField({ id, label, error, hint, ...props }: BaseFieldProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <input id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} {...props} />
      {hint ? <small id={`${id}-hint`}>{hint}</small> : null}
      {error ? <small id={`${id}-error`} className="field-error">{error}</small> : null}
    </label>
  )
}

export function SelectField({ id, label, error, hint, children, ...props }: BaseFieldProps & SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <select id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} {...props}>{children}</select>
      {hint ? <small id={`${id}-hint`}>{hint}</small> : null}
      {error ? <small id={`${id}-error`} className="field-error">{error}</small> : null}
    </label>
  )
}
