interface LogoProps {
  className?: string;
}

export function Logo({ className = "h-4 w-4 text-signal-ink" }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="4.75" y="4.75" width="14.5" height="14.5" transform="rotate(45 12 12)" />
    </svg>
  );
}
