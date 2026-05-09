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
          "bg-[#0E1628] rounded-2xl p-4 flex flex-col justify-between h-full text-left transition-colors hover:bg-[#111B33] focus:outline-none focus:ring-2 focus:ring-white/10",
      }
    : {
        className: "bg-[#0E1628] rounded-2xl p-4 flex flex-col justify-between h-full",
      };

  return (
    <Wrapper {...wrapperProps}>
      <div className="flex items-start justify-between">
        <p className="text-[10px] text-gray-500 uppercase tracking-widest">{label}</p>
        {action && <span className="text-[10px] font-semibold" style={{ color: theme.accent }}>{action}</span>}
      </div>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>

      {progress !== undefined && (
        <div className="w-full bg-[#0A1020] rounded-full h-1.5 mt-2">
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
        <p className={`text-xs mt-1 ${theme.accentText}`}>{sub}</p>
      )}
    </Wrapper>
  );
}