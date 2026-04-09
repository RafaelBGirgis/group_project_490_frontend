import { ROLE_THEMES } from "./theme";

export default function DayTabs({ days, activeIndex, onSelect, role }) {
  const theme = ROLE_THEMES[role] ?? ROLE_THEMES.client;

  return (
    <div className="flex gap-1">
      {days.map((day, i) => {
        const isActive = i === activeIndex;
        return (
          <button
            key={day}
            onClick={() => onSelect(i)}
            className="flex-1 py-1 rounded-lg text-xs font-semibold transition-all"
            style={
              isActive
                ? { backgroundColor: theme.accent, color: "#fff" }
                : { backgroundColor: "#0A1020", color: "#6b7280" }
            }
          >
            {day}
          </button>
        );
      })}
    </div>
  );
}