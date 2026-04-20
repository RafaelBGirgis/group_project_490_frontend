import { ROLE_THEMES } from "./theme";

export default function StatCard({ role, label, value, sub, progress }) {
  const theme = ROLE_THEMES[role] ?? ROLE_THEMES.client;

  return (
    <div className="bg-[#0E1628] rounded-2xl p-4 flex flex-col justify-between h-full">
      <p className="text-[10px] text-gray-500 uppercase tracking-widest">{label}</p>
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
    </div>
  );
}