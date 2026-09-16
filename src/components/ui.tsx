import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';

/* ------------------------------------------------------------------ toast */

interface ToastValue {
  show: (message: string) => void;
}

const ToastContext = createContext<ToastValue>({ show: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback((msg: string) => {
    setMessage(msg);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMessage(null), 2600);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message !== null && (
        <div className="toast" role="status" aria-live="polite">
          {message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  return useContext(ToastContext);
}

/* ------------------------------------------------------------------ pieces */

export function Section({
  title,
  action,
  children,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="section">
      {(title || action) && (
        <div className="section__head">
          {title ? <h2 className="section__title">{title}</h2> : <span />}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Note({
  tone = 'neutral',
  icon,
  children,
}: {
  tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'info' | 'accent';
  icon?: string;
  children: ReactNode;
}) {
  return (
    <div className={`note${tone === 'neutral' ? '' : ` note--${tone}`}`}>
      {icon && (
        <span className="note__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <div className="grow">{children}</div>
    </div>
  );
}

export function Stat({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: ReactNode;
  note?: string;
  tone?: 'good' | 'warn' | 'bad' | 'accent';
}) {
  return (
    <div className={`stat${tone ? ` stat--${tone}` : ''}`}>
      <div className="stat__label">{label}</div>
      <div className="stat__value">{value}</div>
      {note && <div className="stat__note">{note}</div>}
    </div>
  );
}

export function Bar({
  value,
  tone,
  label,
}: {
  /** 0-1 */
  value: number;
  tone?: 'good' | 'warn' | 'bad';
  label?: string;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      className="bar"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? 'Progress'}
    >
      <div className={`bar__fill${tone ? ` bar__fill--${tone}` : ''}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EmptyState({
  icon = '\u{1F4CB}',
  title,
  body,
  action,
}: {
  icon?: string;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty__icon" aria-hidden="true">
        {icon}
      </div>
      <h3>{title}</h3>
      {body && <p className="small muted">{body}</p>}
      {action}
    </div>
  );
}

/** Circular score dial, 0-100. */
export function ScoreDial({
  value,
  size = 46,
  unrated = false,
}: {
  value: number;
  size?: number;
  unrated?: boolean;
}) {
  const stroke = 4.5;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, value));
  const tone = clamped >= 70 ? 'var(--good)' : clamped >= 45 ? 'var(--warn)' : 'var(--bad)';

  return (
    <div className="dial" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--line)"
          strokeWidth={stroke}
        />
        {!unrated && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={tone}
            strokeWidth={stroke}
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - clamped / 100)}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </svg>
      <span className="dial__num" style={{ color: unrated ? 'var(--ink-3)' : tone }}>
        {unrated ? '–' : Math.round(clamped)}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------- forms */

export function Field({
  label,
  hint,
  children,
  full,
}: {
  label?: string;
  hint?: string;
  children: ReactNode;
  full?: boolean;
}) {
  return (
    <div className={`field${full ? ' span2' : ''}`}>
      {label && <label className="field__label">{label}</label>}
      {children}
      {hint && <span className="field__hint">{hint}</span>}
    </div>
  );
}

export function TextInput({
  label,
  hint,
  value,
  onChange,
  full,
  ...rest
}: {
  label?: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  full?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const id = useId();
  return (
    <div className={`field${full ? ' span2' : ''}`}>
      {label && (
        <label className="field__label" htmlFor={id}>
          {label}
        </label>
      )}
      <input
        id={id}
        className="input"
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        {...rest}
      />
      {hint && <span className="field__hint">{hint}</span>}
    </div>
  );
}

export function TextArea({
  label,
  hint,
  value,
  onChange,
  rows = 4,
  placeholder,
  full = true,
}: {
  label?: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  full?: boolean;
}) {
  const id = useId();
  return (
    <div className={`field${full ? ' span2' : ''}`}>
      {label && (
        <label className="field__label" htmlFor={id}>
          {label}
        </label>
      )}
      <textarea
        id={id}
        className="textarea"
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <span className="field__hint">{hint}</span>}
    </div>
  );
}

export function Select<T extends string>({
  label,
  hint,
  value,
  onChange,
  options,
  full,
}: {
  label?: string;
  hint?: string;
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
  full?: boolean;
}) {
  const id = useId();
  return (
    <div className={`field${full ? ' span2' : ''}`}>
      {label && (
        <label className="field__label" htmlFor={id}>
          {label}
        </label>
      )}
      <select
        id={id}
        className="select"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <span className="field__hint">{hint}</span>}
    </div>
  );
}

export function Switch({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      className="switch"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <span className="grow">
        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{label}</span>
        {hint && (
          <span className="field__hint" style={{ display: 'block' }}>
            {hint}
          </span>
        )}
      </span>
      <span className="switch__track" aria-hidden="true">
        <span className="switch__knob" />
      </span>
    </button>
  );
}

/** Multi-line list editor used for pros, cons and other free lists. */
export function ListEditor({
  label,
  items,
  onChange,
  placeholder,
  tone,
}: {
  label: string;
  items: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  tone?: 'good' | 'bad';
}) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    onChange([...items, text]);
    setDraft('');
  };

  return (
    <div className="field span2">
      <label className="field__label">{label}</label>
      {items.length > 0 && (
        <ul className={`bullets${tone ? ` bullets--${tone}` : ''}`} style={{ marginBottom: 8 }}>
          {items.map((item, i) => (
            <li key={`${item}-${i}`}>
              <span className="grow">{item}</span>
              <button
                type="button"
                className="iconbtn"
                style={{ minWidth: 32, minHeight: 32, fontSize: '0.9rem' }}
                aria-label={`Remove ${item}`}
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="row">
        <input
          className="input grow"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="btn btn--sm" onClick={add} disabled={!draft.trim()}>
          Add
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ sheets */

export function Sheet({
  title,
  onClose,
  children,
  footer,
}: {
  title?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div
      className="scrim"
      role="dialog"
      aria-modal="true"
      aria-label={title ?? 'Dialog'}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet">
        <div className="sheet__grip" aria-hidden="true" />
        {title && <h2 className="sheet__title">{title}</h2>}
        {children}
        {footer}
      </div>
    </div>
  );
}

export function ConfirmSheet({
  title,
  body,
  confirmLabel = 'Confirm',
  danger,
  onConfirm,
  onCancel,
}: {
  title: string;
  body?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Sheet title={title} onClose={onCancel}>
      {body && <p className="small muted">{body}</p>}
      <div className="btnrow">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  );
}

/* --------------------------------------------------------------- accordion */

export function Accordion({
  icon,
  title,
  subtitle,
  right,
  defaultOpen = false,
  padded = true,
  children,
}: {
  icon?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  defaultOpen?: boolean;
  padded?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="acc">
      <button type="button" className="acc__head" aria-expanded={open} onClick={() => setOpen(!open)}>
        {icon && (
          <span className="acc__icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <span className="acc__title">
          {title}
          {subtitle && (
            <span className="field__hint" style={{ display: 'block' }}>
              {subtitle}
            </span>
          )}
        </span>
        {right}
        <span className="muted-3" aria-hidden="true" style={{ flex: 'none' }}>
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open && <div className={`acc__body${padded ? ' acc__body--pad' : ''}`}>{children}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ chips */

export function Chip({
  tone,
  children,
}: {
  tone?: 'good' | 'warn' | 'bad' | 'info' | 'accent';
  children: ReactNode;
}) {
  return <span className={`chip${tone ? ` chip--${tone}` : ''}`}>{children}</span>;
}

export function ChipToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="chipbar" role="group">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="chipbtn"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
