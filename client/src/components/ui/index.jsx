import { useState } from 'react'
import clsx from 'clsx'
import { Eye, EyeOff } from 'lucide-react'

// ── Button ──────────────────────────────────────────────────────────────
export const Button = ({ variant = 'primary', size, className, children, ...props }) => (
  <button
    className={clsx(
      'btn',
      variant === 'primary' && 'btn-primary',
      variant === 'secondary' && 'btn-secondary',
      variant === 'danger' && 'btn-danger',
      variant === 'ghost' && 'btn-ghost',
      size === 'sm' && 'btn-sm',
      size === 'lg' && 'btn-lg',
      className
    )}
    {...props}
  >
    {children}
  </button>
)

// ── Badge ────────────────────────────────────────────────────────────────
export const Badge = ({ variant = 'gray', className, children }) => (
  <span className={clsx('badge', `badge-${variant}`, className)}>{children}</span>
)

// ── Input ────────────────────────────────────────────────────────────────
export const Input = ({ label, error, className, type, ...props }) => {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

  return (
    <div className={className}>
      {label && <label className="form-label">{label}</label>}
      <div className="relative">
        <input
          className={clsx('form-input', isPassword && 'pr-10')}
          type={inputType}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
            style={{ height: '100%', top: 0 }}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && <p className="form-error">{error}</p>}
    </div>
  )
}

// ── Select ───────────────────────────────────────────────────────────────
export const Select = ({ label, error, options = [], placeholder, className, ...props }) => (
  <div className={className}>
    {label && <label className="form-label">{label}</label>}
    <select className="form-select" {...props}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    {error && <p className="form-error">{error}</p>}
  </div>
)

// ── Textarea ─────────────────────────────────────────────────────────────
export const Textarea = ({ label, error, className, ...props }) => (
  <div className={className}>
    {label && <label className="form-label">{label}</label>}
    <textarea className="form-textarea" {...props} />
    {error && <p className="form-error">{error}</p>}
  </div>
)

// ── Spinner ──────────────────────────────────────────────────────────────
export const Spinner = ({ size = 'md', className }) => {
  if (size === 'sm') {
    return (
      <div className={clsx('flex items-center justify-center gap-0.5 h-4 inline-flex mr-1.5 align-middle', className)}>
        <span className="w-0.5 h-2 bg-current rounded-full animate-soundwave-sm-1" />
        <span className="w-0.5 h-3.5 bg-current rounded-full animate-soundwave-sm-2" />
        <span className="w-0.5 h-2 bg-current rounded-full animate-soundwave-sm-3" />
      </div>
    )
  }

  return (
    <div className={clsx('flex flex-col items-center justify-center gap-4 relative py-4', className)}>
      {/* Concentric pulsing rings */}
      <div className="absolute w-16 h-16 bg-brand-500/10 rounded-full animate-ping-slow" />
      <div className="absolute w-24 h-24 bg-brand-500/5 rounded-full animate-ping-slower" />
      
      {/* 5-bar voice soundwave loader */}
      <div className="flex items-center justify-center gap-1.5 h-10 z-10">
        <span className="w-1 bg-brand-600 dark:bg-brand-500 rounded-full animate-soundwave-lg-1" style={{ height: '16px' }} />
        <span className="w-1 bg-brand-600 dark:bg-brand-500 rounded-full animate-soundwave-lg-2" style={{ height: '32px' }} />
        <span className="w-1 bg-brand-600 dark:bg-brand-500 rounded-full animate-soundwave-lg-3" style={{ height: '40px' }} />
        <span className="w-1 bg-brand-600 dark:bg-brand-500 rounded-full animate-soundwave-lg-4" style={{ height: '28px' }} />
        <span className="w-1 bg-brand-600 dark:bg-brand-500 rounded-full animate-soundwave-lg-5" style={{ height: '14px' }} />
      </div>
    </div>
  )
}

// ── LoadingState ─────────────────────────────────────────────────────────
export const LoadingState = ({ message = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-3">
    <Spinner size="lg" />
    <p className="text-slate-400 text-sm">{message}</p>
  </div>
)

// ── EmptyState ───────────────────────────────────────────────────────────
export const EmptyState = ({ icon, title, description, action }) => (
  <div className="empty-state">
    <div className="empty-state-icon">{icon}</div>
    <p className="empty-state-title">{title}</p>
    {description && <p className="empty-state-desc">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
)

// ── Card ─────────────────────────────────────────────────────────────────
export const Card = ({ className, children, ...props }) => (
  <div className={clsx('card', className)} {...props}>{children}</div>
)

// ── PageHeader ───────────────────────────────────────────────────────────
export const PageHeader = ({ title, description, actions }) => (
  <div className="page-header">
    <div>
      <h1 className="page-title">{title}</h1>
      {description && <p className="page-desc">{description}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
)

// ── Pagination ───────────────────────────────────────────────────────────
export const Pagination = ({ pagination, onPageChange }) => {
  if (!pagination || pagination.totalPages <= 1) return null
  const { page, totalPages, total, limit } = pagination
  const start = (page - 1) * limit + 1
  const end = Math.min(page * limit, total)

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
      <p className="text-xs text-slate-500">
        Showing {start}–{end} of {total} results
      </p>
      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
        >
          Previous
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={clsx(
                'w-8 h-8 text-xs rounded-lg border',
                p === page ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 hover:bg-slate-50'
              )}
            >
              {p}
            </button>
          )
        })}
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}

// ── Modal ────────────────────────────────────────────────────────────────
export const Modal = ({ open, onClose, title, children, footer, size = 'md' }) => {
  if (!open) return null
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={clsx('relative bg-white dark:bg-zinc-900 rounded-2xl shadow-dialog w-full max-h-[90vh] flex flex-col modal-slide-up', sizes[size])}>
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-zinc-800 shrink-0">
          <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-100">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-1 cursor-pointer">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-slate-100 dark:border-zinc-800 flex justify-end gap-2 shrink-0">{footer}</div>}
      </div>
    </div>
  )
}

// ── ConfirmModal ─────────────────────────────────────────────────────────
export const ConfirmModal = ({ open, onClose, onConfirm, title, message, confirmLabel = 'Delete', loading }) => (
  <Modal open={open} onClose={onClose} title={title}
    footer={
      <>
        <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm} disabled={loading}>
          {loading ? <Spinner size="sm" /> : confirmLabel}
        </Button>
      </>
    }
  >
    <p className="text-slate-600 text-sm">{message}</p>
  </Modal>
)

// ── StatusBadge ───────────────────────────────────────────────────────────
export const StatusBadge = ({ status }) => {
  const { getStatusColor, getStatusLabel } = require('../utils/formatters')
  return <Badge variant={getStatusColor(status).replace('badge-', '')}>{getStatusLabel(status)}</Badge>
}

// ── SearchInput ───────────────────────────────────────────────────────────
export const SearchInput = ({ value, onChange, placeholder = 'Search...', className }) => (
  <div className={clsx('relative', className)}>
    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="form-input pl-9"
    />
  </div>
)
