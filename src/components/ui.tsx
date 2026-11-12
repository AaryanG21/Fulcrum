import Link from "next/link";
import {
  cloneElement,
  useId,
  type ButtonHTMLAttributes,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";

export function Panel({
  title,
  description,
  action,
  children,
  className = "",
  as: Heading = "h2",
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <section className={`glass rounded-2xl ${className}`}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-4 border-b border-line/70 px-6 py-5">
          <div className="min-w-0">
            {title && (
              <Heading className="rule-accent inline-block pb-2 font-display text-lg font-semibold tracking-tight text-ink">
                {title}
              </Heading>
            )}
            {description && (
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

type Tone = "signal" | "critical" | "high" | "medium" | "low" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  signal: "border-signal/40 bg-signal/10 text-signal-ink",
  critical: "border-sev-critical/40 bg-sev-critical/10 text-sev-critical",
  high: "border-sev-high/40 bg-sev-high/10 text-sev-high",
  medium: "border-sev-medium/40 bg-sev-medium/10 text-sev-medium",
  low: "border-sev-low/40 bg-sev-low/10 text-sev-low",
  neutral: "border-line-bright bg-surface-2 text-ink-muted",
};

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] tracking-wide ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="glass rounded-2xl px-5 py-4">
      <div className="eyebrow text-ink-faint">{label}</div>
      <div className="display mt-2 text-3xl text-ink">{value}</div>
      {hint && <div className="mt-1.5 text-xs text-ink-faint">{hint}</div>}
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactElement<{
    id?: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
  }>;
}) {
  const generated = useId();
  const controlId = children.props.id ?? generated;
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;

  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  const control = cloneElement(children, {
    id: controlId,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
  });

  return (
    <div>
      <label htmlFor={controlId} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="mt-0.5 text-xs text-ink-faint">
          {hint}
        </p>
      )}
      <div className="mt-1.5">{control}</div>
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-sev-critical">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClass =
  "w-full rounded-xl border border-line-bright/70 bg-surface px-3.5 py-2.5 text-ink shadow-[inset_0_1px_2px_rgba(11,16,32,0.08)] transition-colors placeholder:text-ink-faint hover:border-line-bright focus:border-signal-ink";

export const buttonClass =
  "btn-glow inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0";

export const buttonGhostClass =
  "glass-2 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-signal-ink/50 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50";

export const buttonQuietClass =
  "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink";

type Variant = "primary" | "ghost" | "quiet";

const VARIANT_CLASS: Record<Variant, string> = {
  primary: buttonClass,
  ghost: buttonGhostClass,
  quiet: buttonQuietClass,
};

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type={type} className={`${VARIANT_CLASS[variant]} ${className}`} {...rest} />;
}

export function LinkButton({
  variant = "primary",
  className = "",
  ...rest
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={`${VARIANT_CLASS[variant]} ${className}`} {...rest} />;
}

export function Alert({
  tone = "critical",
  children,
}: {
  tone?: "critical" | "signal" | "neutral";
  children: ReactNode;
}) {
  const cls =
    tone === "critical"
      ? "border-sev-critical/40 bg-sev-critical/10 text-sev-critical"
      : tone === "signal"
        ? "border-signal/40 bg-signal/10 text-signal-ink"
        : "border-line-bright bg-surface-2 text-ink-muted";

  return (
    <div
      role={tone === "critical" ? "alert" : "status"}
      className={`rounded-xl border px-3.5 py-2.5 text-sm leading-relaxed ${cls}`}
    >
      {children}
    </div>
  );
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`spin ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={2.5} opacity={0.25} />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Busy({ children }: { children: ReactNode }) {
  return (
    <>
      <Spinner />
      {children}
    </>
  );
}

export function IndeterminateBar({ className = "" }: { className?: string }) {
  return (
    <div
      className={`sweep-track h-1 w-full rounded-full bg-ink/10 ${className}`}
      aria-hidden="true"
    >
      <div className="sweep h-full w-1/4 rounded-full bg-signal-ink" />
    </div>
  );
}
