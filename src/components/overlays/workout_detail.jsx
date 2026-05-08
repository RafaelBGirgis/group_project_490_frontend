import { DayTabs, ListRow, StatusBadge } from "..";

/**
 * Read-only daily workout view used by the client dashboard's "View all" overlay.
 *
 * Props:
 *   planName, activities[], weekdays[], activeDay, onDayChange, onLog
 *   activities: [{ id, name, suggested_sets, suggested_reps, intensity_value, intensity_measure, logged }]
 */
export default function WorkoutDetail({
  planName,
  activities = [],
  weekdays = [],
  activeDay = 0,
  onDayChange,
  onLog,
}) {
  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs text-gray-500 uppercase tracking-widest">Workout plan</p>
        <h2 className="text-xl font-bold text-white">{planName || "Today"}</h2>
      </header>

      {weekdays.length ? (
        <DayTabs days={weekdays} activeIndex={activeDay} onSelect={onDayChange} role="client" />
      ) : null}

      {activities.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">No activities for this day.</p>
      ) : (
        <div className="space-y-2">
          {activities.map((a) => (
            <ListRow
              key={a.id}
              label={a.name}
              sub={`${a.suggested_sets ?? 0} sets · ${a.suggested_reps ?? 0} reps · ${a.intensity_value ?? 0} ${a.intensity_measure ?? ""}`}
              right={
                a.logged ? (
                  <StatusBadge label="Logged ✓" variant="success" />
                ) : (
                  <button
                    onClick={() => onLog?.(a.id)}
                    className="text-blue-400 text-xs border border-blue-500/50 rounded-full px-3 py-1 hover:bg-blue-500/10 transition-colors"
                  >
                    Log →
                  </button>
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
