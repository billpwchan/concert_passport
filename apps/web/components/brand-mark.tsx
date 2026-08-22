export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      role="img"
      aria-label="Concert Passport"
    >
      <defs>
        <mask id="concert-passport-route-mark">
          <circle cx="23" cy="24" r="17.5" fill="white" />
          <path d="M4 27c6 0 7-9 12-9s6 13 11 13 7-9 15-9" fill="none" stroke="black" strokeLinecap="round" strokeWidth="4.2" />
        </mask>
      </defs>
      <circle cx="23" cy="24" r="17.5" fill="currentColor" mask="url(#concert-passport-route-mark)" />
      <circle cx="42" cy="22" r="3.2" fill="var(--accent, #6753e8)" />
    </svg>
  );
}
