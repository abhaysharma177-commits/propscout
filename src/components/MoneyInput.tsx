import { useEffect, useId, useState } from 'react';
import { formatPlain, inWords, parseMoney, parseNum } from '../lib/money';

/**
 * Money field that accepts what a person actually types — "1.2cr", "85 lakh",
 * "8500000" — and echoes back the parsed figure in words underneath, so a
 * mistyped zero is caught before it reaches the negotiation maths.
 */
export function MoneyInput({
  label,
  hint,
  value,
  onChange,
  placeholder = 'e.g. 1.2 cr',
  full,
}: {
  label?: string;
  hint?: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
  full?: boolean;
}) {
  const id = useId();
  const [text, setText] = useState(() => (value === undefined ? '' : String(value)));
  const [focused, setFocused] = useState(false);

  // Keep in step when the value changes from elsewhere, but never fight the
  // user while they are mid-type.
  useEffect(() => {
    if (focused) return;
    setText(value === undefined ? '' : String(value));
  }, [value, focused]);

  const parsed = parseMoney(text);
  const words = inWords(parsed);
  const invalid = text.trim().length > 0 && parsed === undefined;

  return (
    <div className={`field${full ? ' span2' : ''}`}>
      {label && (
        <label className="field__label" htmlFor={id}>
          {label}
        </label>
      )}
      <input
        id={id}
        className="input mono"
        inputMode="decimal"
        autoComplete="off"
        value={text}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          if (parsed !== undefined) setText(String(parsed));
        }}
        onChange={(e) => {
          setText(e.target.value);
          onChange(parseMoney(e.target.value));
        }}
      />
      {invalid ? (
        <span className="field__hint" style={{ color: 'var(--bad)' }}>
          Could not read that number. Try 8500000, or 85 lakh, or 1.2 cr.
        </span>
      ) : parsed !== undefined && parsed > 0 ? (
        <span className="field__hint">
          ₹{formatPlain(parsed)}
          {words ? ` · ${words}` : ''}
        </span>
      ) : (
        hint && <span className="field__hint">{hint}</span>
      )}
    </div>
  );
}

/** Plain numeric field for areas, counts and percentages. */
export function NumberInput({
  label,
  hint,
  value,
  onChange,
  suffix,
  placeholder,
  full,
  step,
}: {
  label?: string;
  hint?: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  suffix?: string;
  placeholder?: string;
  full?: boolean;
  step?: string;
}) {
  const id = useId();
  const [text, setText] = useState(() => (value === undefined ? '' : String(value)));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (focused) return;
    setText(value === undefined ? '' : String(value));
  }, [value, focused]);

  return (
    <div className={`field${full ? ' span2' : ''}`}>
      {label && (
        <label className="field__label" htmlFor={id}>
          {label}
          {suffix ? <span className="muted-3"> ({suffix})</span> : null}
        </label>
      )}
      <input
        id={id}
        className="input mono"
        inputMode="decimal"
        autoComplete="off"
        step={step}
        value={text}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          setText(e.target.value);
          onChange(parseNum(e.target.value));
        }}
      />
      {hint && <span className="field__hint">{hint}</span>}
    </div>
  );
}
