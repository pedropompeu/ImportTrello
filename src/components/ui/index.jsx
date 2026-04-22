// ─── Button ──────────────────────────────────────────────────────────────────
export function Btn({ children, variant = 'primary', size = 'md', disabled, onClick, style, className, title }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 'var(--r-sm)', fontFamily: 'var(--font)',
    fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all .15s', border: '1px solid transparent',
    opacity: disabled ? .45 : 1,
  }
  const sizes = {
    xs: { padding: '3px 8px',  fontSize: 11 },
    sm: { padding: '5px 11px', fontSize: 12 },
    md: { padding: '7px 14px', fontSize: 13 },
    lg: { padding: '10px 20px',fontSize: 14 },
  }
  const variants = {
    primary: { background: 'var(--ac)', color: '#fff', borderColor: 'var(--ac)' },
    ghost:   { background: 'transparent', color: 'var(--t2)', borderColor: 'var(--b2)' },
    danger:  { background: 'var(--red-bg)', color: 'var(--red)', borderColor: 'var(--red-bg)' },
    success: { background: 'var(--green-bg)', color: 'var(--green)', borderColor: 'var(--green-bg)' },
    subtle:  { background: 'var(--s3)', color: 'var(--t2)', borderColor: 'var(--b1)' },
  }
  return (
    <button
      onClick={!disabled ? onClick : undefined}
      title={title}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
    >
      {children}
    </button>
  )
}

// ─── Badge (tipo/label) ───────────────────────────────────────────────────────
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
  const pad = size === 'xs' ? '2px 6px' : '3px 9px'
  const fs  = size === 'xs' ? 10 : 11
  return (
    <span style={{
      padding: pad, borderRadius: 99, fontSize: fs,
      fontFamily: 'var(--mono)', letterSpacing: '.3px',
      background: c.bg, border: `1px solid ${c.b}`, color: c.t,
      whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      {tipo}
    </span>
  )
}

export function StatusBadge({ status }) {
  const map = {
    pending:   { bg: 'var(--s3)',        b: 'var(--b2)',      t: 'var(--t3)',   label: 'pendente'    },
    importing: { bg: 'var(--blue-bg)',   b: 'var(--blue)',    t: 'var(--blue)', label: 'enviando...' },
    done:      { bg: 'var(--green-bg)',  b: 'var(--green)',   t: 'var(--green)',label: 'enviada ✓'   },
    error:     { bg: 'var(--red-bg)',    b: 'var(--red)',     t: 'var(--red)',  label: 'erro'        },
    draft:     { bg: 'var(--yellow-bg)', b: 'var(--yellow)',  t: 'var(--yellow)',label:'rascunho'    },
    ready:     { bg: 'var(--blue-bg)',   b: 'var(--blue)',    t: 'var(--blue)', label: 'pronto'      },
    done_proj: { bg: 'var(--green-bg)',  b: 'var(--green)',   t: 'var(--green)',label: 'concluído'   },
  }
  const c = map[status] || map.pending
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 99, fontSize: 10,
      fontFamily: 'var(--mono)',
      background: c.bg, border: `1px solid ${c.b}`, color: c.t,
    }}>
      {c.label}
    </span>
  )
}

// ─── Input ────────────────────────────────────────────────────────────────────
export function Input({ label, hint, error, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'var(--mono)' }}>{label}</label>}
      <input
        {...props}
        style={{
          width: '100%', padding: '8px 11px',
          background: 'var(--s2)', border: `1px solid ${error ? 'var(--red)' : 'var(--b1)'}`,
          borderRadius: 'var(--r-sm)', color: 'var(--t1)', fontSize: 12,
          transition: 'border-color .15s',
          ...props.style,
        }}
        onFocus={e  => { e.target.style.borderColor = 'var(--ac)';  props.onFocus?.(e)  }}
        onBlur={e   => { e.target.style.borderColor = error ? 'var(--red)' : 'var(--b1)'; props.onBlur?.(e) }}
      />
      {(hint || error) && <span style={{ fontSize: 10, color: error ? 'var(--red)' : 'var(--t3)', fontFamily: 'var(--mono)' }}>{error || hint}</span>}
    </div>
  )
}

export function Textarea({ label, hint, rows = 4, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'var(--mono)' }}>{label}</label>}
      <textarea
        rows={rows}
        {...props}
        style={{
          width: '100%', padding: '8px 11px', resize: 'vertical',
          background: 'var(--s2)', border: '1px solid var(--b1)',
          borderRadius: 'var(--r-sm)', color: 'var(--t1)', fontSize: 12,
          lineHeight: 1.6, transition: 'border-color .15s',
          ...props.style,
        }}
        onFocus={e => { e.target.style.borderColor = 'var(--ac)' }}
        onBlur={e  => { e.target.style.borderColor = 'var(--b1)' }}
      />
      {hint && <span style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--mono)' }}>{hint}</span>}
    </div>
  )
}

export function Select({ label, options, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'var(--mono)' }}>{label}</label>}
      <select
        {...props}
        style={{
          width: '100%', padding: '8px 11px',
          background: 'var(--s2)', border: '1px solid var(--b1)',
          borderRadius: 'var(--r-sm)', color: 'var(--t1)', fontSize: 12, cursor: 'pointer',
          ...props.style,
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
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
        background: 'rgba(0,0,0,.8)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(6px)', animation: 'fadeIn .15s ease',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose?.() }}
    >
      <div style={{
        width, maxHeight: '88vh', background: 'var(--s1)',
        border: '1px solid var(--b2)', borderRadius: 'var(--r-lg)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,.6)', animation: 'fadeUp .2s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--b1)', flexShrink: 0 }}>
          <h3 style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ color: 'var(--t3)', cursor: 'pointer', padding: 2, display:'flex' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>{children}</div>
        {footer && <div style={{ padding: '14px 20px', borderTop: '1px solid var(--b1)', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>{footer}</div>}
      </div>
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────
export function Toast({ toast }) {
  if (!toast) return null
  const colors = {
    success: { bg: 'var(--green-bg)', b: 'var(--green)', t: 'var(--green)' },
    error:   { bg: 'var(--red-bg)',   b: 'var(--red)',   t: 'var(--red)'   },
    info:    { bg: 'var(--blue-bg)',  b: 'var(--blue)',  t: 'var(--blue)'  },
  }
  const c = colors[toast.type] || colors.info
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      padding: '10px 16px', borderRadius: 'var(--r)',
      background: c.bg, border: `1px solid ${c.b}`, color: c.t,
      fontFamily: 'var(--mono)', fontSize: 12, maxWidth: 360,
      boxShadow: '0 8px 24px rgba(0,0,0,.4)',
      animation: 'fadeUp .2s ease',
    }}>
      {toast.message}
    </div>
  )
}

// ─── Section label ────────────────────────────────────────────────────────────
export function SectionLabel({ children, style }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 600, color: 'var(--t3)',
      textTransform: 'uppercase', letterSpacing: '.6px',
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
export function Spinner({ size = 16, color = 'var(--ac2)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" className="anim-spin" style={{ flexShrink: 0 }}>
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  )
}

// ─── ProgressBar ─────────────────────────────────────────────────────────────
export function ProgressBar({ progress, color = 'var(--ac)', height = 4, showPercent = false }) {
  const p = Math.min(100, Math.max(0, progress))
  return (
    <div style={{ width: '100%' }}>
      <div style={{
        width: '100%', height, background: 'var(--s3)',
        borderRadius: 99, overflow: 'hidden', position: 'relative'
      }}>
        <div style={{
          width: `${p}%`, height: '100%', background: color,
          transition: 'width .3s ease-out'
        }} />
      </div>
      {showPercent && (
        <div style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--t3)', marginTop: 4, textAlign: 'right' }}>
          {Math.round(p)}%
        </div>
      )}
    </div>
  )
}

// ─── Empty state ─────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', gap: 12, textAlign: 'center' }}>
      <div style={{ fontSize: 36 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)' }}>{title}</div>
      {description && <div style={{ fontSize: 12, color: 'var(--t3)', maxWidth: 300 }}>{description}</div>}
      {action}
    </div>
  )
}
