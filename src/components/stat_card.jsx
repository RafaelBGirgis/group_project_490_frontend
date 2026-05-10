import { ROLE_THEMES } from "./theme";

export default function StatCard({ role, label, value, sub, progress, onClick, action }) {
  const theme = ROLE_THEMES[role] ?? ROLE_THEMES.client;
  const interactive = typeof onClick === "function";

  const Wrapper = interactive ? "button" : "div";
  const wrapperProps = interactive
    ? {
        type: "button",
        onClick,
        className:
          "relative overflow-hidden bg-[#0F1729] border border-white/6 rounded-2xl p-4 flex flex-col justify-between h-full text-left transition-all duration-300 ease-out hover:border-transparent hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-white/10 group",
      }
    : {
        className: "relative overflow-hidden bg-[#0F1729] border border-white/6 rounded-2xl p-4 flex flex-col justify-between h-full transition-all duration-300 ease-out hover:border-transparent hover:-translate-y-1 hover:shadow-lg group",
      };

  return (
    <Wrapper {...wrapperProps}>
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${theme.accent}30, transparent 50%, ${theme.accent}15)`,
        }}
      />
      <div
        className="absolute top-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-500 ease-out"
        style={{ backgroundColor: theme.accent }}
      />

      <div className="relative z-10 flex items-start justify-between">
        <p className="text-[10px] text-gray-500 uppercase tracking-widest">{label}</p>
        {action && <span className="text-[10px] font-semibold" style={{ color: theme.accent }}>{action}</span>}
      </div>
      <p className="relative z-10 text-2xl font-bold text-white mt-1">{value}</p>

      {progress !== undefined && (
        <div className="relative z-10 w-full bg-[#0A1020] rounded-full h-1.5 mt-2">
          <div
            className="h-1.5 rounded-full transition-all"
            style={{
              width: `${Math.min(progress, 100)}%`,
              backgroundColor: theme.accent,
            }}
          />
        </div>
      )}

      {sub && (
        <p className="relative z-10 text-xs mt-1" style={{ color: theme.accentText }}>{sub}</p>
      )}
    </Wrapper>
  );
}
