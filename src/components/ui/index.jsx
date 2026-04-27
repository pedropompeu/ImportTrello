import { Loader2 } from 'lucide-react'

// ─── Button ──────────────────────────────────────────────────────────────────
export function Btn({ children, variant = 'primary', size = 'md', disabled, onClick, style, title }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 5, borderRadius: 'var(--r-sm)', fontFamily: 'var(--font)',
    fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all .12s', border: '1px solid transparent',
    opacity: disabled ? .45 : 1, letterSpacing: '-.01em',
    whiteSpace: 'nowrap',
  }
  const sizes = {
    xs: { padding: '3px 8px',   fontSize: 11 },
    sm: { padding: '5px 11px',  fontSize: 12 },
    md: { padding: '7px 14px',  fontSize: 13 },
    lg: { padding: '9px 20px',  fontSize: 14 },
  }
  const variants = {
    primary: { background: 'var(--ac)',       color: '#fff',          borderColor: 'var(--ac)'        },
    ghost:   { background: 'transparent',     color: 'var(--t2)',     borderColor: 'var(--b2)'        },
    danger:  { background: 'var(--red-bg)',   color: 'var(--red)',    borderColor: 'rgba(240,92,110,.2)' },
    success: { background: 'var(--green-bg)', color: 'var(--green)',  borderColor: 'rgba(52,201,138,.2)' },
    subtle:  { background: 'var(--s3)',       color: 'var(--t2)',     borderColor: 'var(--b1)'        },
  }
  return (
    <button onClick={!disabled ? onClick : undefined} title={title}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}>
      {children}
    </button>
  )
}

// ─── Type badge ───────────────────────────────────────────────────────────────
const BADGE_MAP = {
  'Backend':        { bg: 'var(--backend-bg)',  b: 'var(--backend-b)',  t: 'var(--backend-t)'  },
  'Frontend':       { bg: 'var(--frontend-bg)', b: 'var(--frontend-b)', t: 'var(--frontend-t)' },
  'Infra / Config': { bg: 'var(--infra-bg)',    b: 'var(--infra-b)',    t: 'var(--infra-t)'    },
  'Testes':         { bg: 'var(--testes-bg)',   b: 'var(--testes-b)',   t: 'var(--testes-t)'   },
  'Docs':           { bg: 'var(--docs-bg)',     b: 'var(--docs-b)',     t: 'var(--docs-t)'     },
  'Mobile':         { bg: 'var(--mobile-bg)',   b: 'var(--mobile-b)',   t: 'var(--mobile-t)'   },
  'DevOps':         { bg: 'var(--devops-bg)',   b: 'var(--devops-b)',   t: 'var(--devops-t)'   },
}

export function TypeBadge({ tipo, size = 'sm' }) {
  const c   = BADGE_MAP[tipo] || BADGE_MAP['Backend']
  const pad = size === 'xs' ? '2px 6px' : '3px 8px'
  const fs  = size === 'xs' ? 10 : 11
  return (
    <span style={{
      padding: pad, borderRadius: 4, fontSize: fs,
      fontFamily: 'var(--mono)', letterSpacing: '.2px', fontWeight: 500,
      background: c.bg, border: `1px solid ${c.b}`, color: c.t,
      whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      {tipo}
    </span>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const map = {
    pending:   { bg: 'var(--s3)',         b: 'var(--b2)',       t: 'var(--t3)',    dot: 'var(--t3)',    label: 'Pendente'    },
    importing: { bg: 'var(--blue-bg)',    b: 'rgba(79,110,247,.25)', t: 'var(--ac2)', dot: 'var(--ac2)', label: 'Enviando'  },
    done:      { bg: 'var(--green-bg)',   b: 'rgba(52,201,138,.25)', t: 'var(--green)', dot: 'var(--green)', label: 'Enviada' },
    error:     { bg: 'var(--red-bg)',     b: 'rgba(240,92,110,.25)', t: 'var(--red)',   dot: 'var(--red)',   label: 'Erro'    },
    draft:     { bg: 'var(--yellow-bg)',  b: 'rgba(245,166,35,.25)', t: 'var(--yellow)',dot: 'var(--yellow)',label: 'Rascunho'},
    ready:     { bg: 'var(--blue-bg)',    b: 'rgba(79,110,247,.25)', t: 'var(--ac2)', dot: 'var(--ac2)',   label: 'Pronto'   },
    done_proj: { bg: 'var(--green-bg)',   b: 'rgba(52,201,138,.25)', t: 'var(--green)', dot: 'var(--green)', label: 'Concluído' },
  }
  const c = map[status] || map.pending
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 8px', borderRadius: 4, fontSize: 11,
      fontFamily: 'var(--mono)', fontWeight: 500,
      background: c.bg, border: `1px solid ${c.b}`, color: c.t,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {c.label}
    </span>
  )
}

// ─── Input ────────────────────────────────────────────────────────────────────
export function Input({ label, hint, error, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && (
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.6px', fontFamily: 'var(--mono)' }}>
          {label}
        </label>
      )}
      <input
        {...props}
        style={{
          width: '100%', padding: '8px 11px',
          background: 'var(--s2)', border: `1px solid ${error ? 'var(--red)' : 'var(--b1)'}`,
          borderRadius: 'var(--r-sm)', color: 'var(--t1)', fontSize: 13,
          transition: 'border-color .12s',
          ...props.style,
        }}
        onFocus={e  => { e.target.style.borderColor = 'var(--ac)';  props.onFocus?.(e)  }}
        onBlur={e   => { e.target.style.borderColor = error ? 'var(--red)' : 'var(--b1)'; props.onBlur?.(e) }}
      />
      {(hint || error) && (
        <span style={{ fontSize: 11, color: error ? 'var(--red)' : 'var(--t3)', fontFamily: 'var(--mono)' }}>
          {error || hint}
        </span>
      )}
    </div>
  )
}

// ─── Textarea ─────────────────────────────────────────────────────────────────
export function Textarea({ label, hint, rows = 4, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && (
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.6px', fontFamily: 'var(--mono)' }}>
          {label}
        </label>
      )}
      <textarea
        rows={rows} {...props}
        style={{
          width: '100%', padding: '8px 11px', resize: 'vertical',
          background: 'var(--s2)', border: '1px solid var(--b1)',
          borderRadius: 'var(--r-sm)', color: 'var(--t1)', fontSize: 13,
          lineHeight: 1.6, transition: 'border-color .12s',
          ...props.style,
        }}
        onFocus={e => { e.target.style.borderColor = 'var(--ac)' }}
        onBlur={e  => { e.target.style.borderColor = 'var(--b1)' }}
      />
      {hint && <span style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--mono)' }}>{hint}</span>}
    </div>
  )
}

// ─── Select ───────────────────────────────────────────────────────────────────
export function Select({ label, options, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && (
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.6px', fontFamily: 'var(--mono)' }}>
          {label}
        </label>
      )}
      <select
        {...props}
        style={{
          width: '100%', padding: '8px 11px',
          background: 'var(--s2)', border: '1px solid var(--b1)',
          borderRadius: 'var(--r-sm)', color: 'var(--t1)', fontSize: 13, cursor: 'pointer',
          ...props.style,
        }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ title, onClose, children, width = 600, footer }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,.75)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(8px)', animation: 'fadeIn .14s ease',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose?.() }}
    >
      <div style={{
        width, maxHeight: '88vh', background: 'var(--s1)',
        border: '1px solid var(--b2)', borderRadius: 'var(--r-lg)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,.6)', animation: 'fadeUp .18s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--b1)', flexShrink: 0 }}>
          <h3 style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--t1)' }}>{title}</h3>
          <button onClick={onClose} style={{ color: 'var(--t3)', cursor: 'pointer', padding: 4, display: 'flex', borderRadius: 4 }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--t1)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--t3)'}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>{children}</div>
        {footer && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--b1)', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────
export function Toast({ toast }) {
  if (!toast) return null
  const colors = {
    success: { bg: 'var(--green-bg)', b: 'rgba(52,201,138,.3)',  t: 'var(--green)', dot: 'var(--green)' },
    error:   { bg: 'var(--red-bg)',   b: 'rgba(240,92,110,.3)',  t: 'var(--red)',   dot: 'var(--red)'   },
    info:    { bg: 'var(--ac-bg)',    b: 'rgba(79,110,247,.3)',   t: 'var(--ac2)',   dot: 'var(--ac2)'   },
  }
  const c = colors[toast.type] || colors.info
  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 14px', borderRadius: 'var(--r)',
      background: 'var(--s1)', border: `1px solid ${c.b}`, color: c.t,
      fontFamily: 'var(--mono)', fontSize: 12, maxWidth: 360,
      boxShadow: '0 8px 32px rgba(0,0,0,.5)',
      animation: 'fadeUp .18s ease',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {toast.message}
    </div>
  )
}

// ─── Section label ────────────────────────────────────────────────────────────
export function SectionLabel({ children, style }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 600, color: 'var(--t3)',
      textTransform: 'uppercase', letterSpacing: '.7px',
      fontFamily: 'var(--mono)', marginBottom: 8, ...style,
    }}>
      {children}
    </div>
  )
}

// ─── Divider ──────────────────────────────────────────────────────────────────
export function Divider({ style }) {
  return <div style={{ height: 1, background: 'var(--b1)', margin: '16px 0', ...style }} />
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 16 }) {
  return <Loader2 size={size} className="anim-spin" style={{ flexShrink: 0, color: 'var(--ac2)' }} />
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
export function ProgressBar({ progress, color = 'var(--ac)', height = 4, showPercent = false }) {
  const p = Math.min(100, Math.max(0, progress))
  return (
    <div style={{ width: '100%' }}>
      <div style={{ width: '100%', height, background: 'var(--s3)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${p}%`, height: '100%', background: color, transition: 'width .3s ease-out' }} />
      </div>
      {showPercent && (
        <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--t3)', marginTop: 4, textAlign: 'right' }}>
          {Math.round(p)}%
        </div>
      )}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', gap: 12, textAlign: 'center' }}>
      <div style={{ color: 'var(--t3)', display: 'flex' }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)' }}>{title}</div>
      {description && <div style={{ fontSize: 12, color: 'var(--t3)', maxWidth: 300, lineHeight: 1.6 }}>{description}</div>}
      {action && <div style={{ marginTop: 4 }}>{action}</div>}
    </div>
  )
}
