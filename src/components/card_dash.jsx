import { ROLE_THEMES } from "./theme";

export function DashboardCard({ title, action, role = "client", children, className = "" }) {
  const theme = ROLE_THEMES[role];

  return (
    <div
      className={`
        relative overflow-hidden
        bg-[#0F1729] border border-white/6 rounded-2xl p-5
        transition-all duration-300 ease-out
        hover:border-transparent
        hover:-translate-y-1
        hover:shadow-lg
        group
        ${className}
      `}
      style={{
        "--accent": theme.accent,
        "--accent-light": theme.accentLight,
      }}
    >
      {/* Animated glow border on hover */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${theme.accent}30, transparent 50%, ${theme.accent}15)`,
        }}
      />

      {/* Top accent line that slides in on hover */}
      <div
        className="absolute top-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-500 ease-out"
        style={{ backgroundColor: theme.accent }}
      />

      {/* Content */}
      <div className="relative z-10">
        {(title || action) && (
          <div className="flex items-center justify-between mb-4">
            {title && (
              <h3 className="text-white font-semibold text-base group-hover:translate-x-1 transition-transform duration-300">
                {title}
              </h3>
            )}
            {action && (
              <button
                onClick={action.onClick}
                className="text-sm font-medium transition-all duration-300 group-hover:translate-x-1"
                style={{ color: theme.accentText }}
              >
                {action.label} →
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}