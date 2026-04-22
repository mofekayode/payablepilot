export function PilotMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path d="M22 2 L2 9 L11 13 Z" fill="currentColor" />
      <path d="M22 2 L11 13 L15 22 Z" fill="currentColor" fillOpacity="0.55" />
    </svg>
  );
}
