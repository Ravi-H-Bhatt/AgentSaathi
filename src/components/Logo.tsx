export function Logo({
  size = 28,
  withText = true,
  light = false,
}: {
  size?: number;
  withText?: boolean;
  light?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden
      >
        <rect
          width="32"
          height="32"
          rx="8"
          fill={light ? "#ffffff" : "#0a0a0a"}
        />
        {/* Upward trend / shield mark */}
        <path
          d="M9 20.5L14 15l3 3 6-7"
          stroke={light ? "#0a0a0a" : "#ffffff"}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M19 11h4v4"
          stroke={light ? "#0a0a0a" : "#ffffff"}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {withText && (
        <span
          className={`text-lg font-bold tracking-tight ${
            light ? "text-white" : "text-foreground"
          }`}
        >
          Agent<span className="opacity-60">Saathi</span>
        </span>
      )}
    </span>
  );
}
