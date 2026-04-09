import { ROLE_THEMES } from "./theme";

export default function SectionHeader({ label, role }) {
  const theme = ROLE_THEMES[role] ?? ROLE_THEMES.client;

  return (
    <div className="flex items-center gap-3 pt-2">
      <span className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${theme.accentText}`}>
        {label}
      </span>
      <div
        className="flex-1 h-px"
        style={{ backgroundColor: theme.accent + "25" }}
      />
    </div>
  );
}