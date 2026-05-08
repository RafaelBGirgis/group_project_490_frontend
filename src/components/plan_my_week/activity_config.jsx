import { useEffect, useMemo, useState } from "react";
import { listWorkoutActivities } from "../../api/plan_my_week";
import { estimateCalories, intensityLabel } from "../../contexts/plan_my_week_context";
import { ROLE_THEMES } from "../theme";
import { usePlanMyWeek } from "../../contexts/plan_my_week_context";

/**
 * Lets the user pick an intensity option (one of the WorkoutActivity rows
 * for the chosen Workout) and set planned reps/sets or duration.
 *
 * Props:
 *   workout: { id, name, workout_type }
 *   editingDraft: existing draft to prefill from (may be null)
 *   onClose, onSubmit(activityDraft)
 */
export default function ActivityConfig({ workout, editingDraft, onClose, onSubmit }) {
  const { state } = usePlanMyWeek();
  const theme = ROLE_THEMES[state.role] ?? ROLE_THEMES.client;
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedActivityId, setSelectedActivityId] = useState(
    editingDraft?.workout_activity_id ?? null
  );
  const [reps, setReps] = useState(editingDraft?.planned_reps ?? "");
  const [sets, setSets] = useState(editingDraft?.planned_sets ?? "");
  const [duration, setDuration] = useState(editingDraft?.planned_duration ?? "");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listWorkoutActivities(workout.id)
      .then((rows) => {
        if (!alive) return;
        setActivities(rows);
        if (selectedActivityId == null && rows.length) {
          setSelectedActivityId(rows[0].id);
        }
      })
      .catch((e) => alive && setError(e?.message || "Failed to load activities"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workout.id]);

  const selected = useMemo(
    () => activities.find((a) => a.id === selectedActivityId) || null,
    [activities, selectedActivityId]
  );

  const calories = useMemo(() => {
    if (!selected) return 0;
    return estimateCalories({
      workout_type: workout.workout_type,
      calories_per_unit_frequency: selected.estimated_calories_per_unit_frequency,
      planned_reps: reps,
      planned_sets: sets,
      planned_duration: duration,
    });
  }, [selected, reps, sets, duration, workout.workout_type]);

  function handleSubmit() {
    if (!selected) {
      setError("Pick an intensity tier.");
      return;
    }
    if (workout.workout_type === "duration") {
      if (!Number(duration)) {
        setError("Duration must be greater than zero.");
        return;
      }
    } else if (!Number(reps) || !Number(sets)) {
      setError("Reps and sets must be greater than zero.");
      return;
    }
    onSubmit({
      workout_id: workout.id,
      workout_name: workout.name,
      workout_type: workout.workout_type,
      workout_activity_id: selected.id,
      intensity_measure: selected.intensity_measure,
      intensity_value: selected.intensity_value,
      calories_per_unit_frequency: Number(selected.estimated_calories_per_unit_frequency),
      planned_reps: workout.workout_type === "rep" ? Number(reps) : null,
      planned_sets: workout.workout_type === "rep" ? Number(sets) : null,
      planned_duration: workout.workout_type === "duration" ? Number(duration) : null,
      estimated_calories: calories,
    });
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#0F1729] rounded-2xl border border-white/10 max-w-md w-full p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">{workout.name}</h3>
            <p className="text-xs text-gray-500 uppercase tracking-widest">
              {workout.workout_type}-based
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500 py-6 text-center">Loading intensity options…</p>
        ) : error ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-300">{error}</div>
        ) : activities.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">
            This workout has no intensity options yet — a coach must add some first.
          </p>
        ) : (
          <>
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Intensity</label>
              <div className="space-y-1">
                {activities.map((a) => (
                  <label
                    key={a.id}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border cursor-pointer ${
                      selectedActivityId === a.id
                        ? `${theme.borderAccent} ${theme.tagBg}`
                        : "border-white/10 hover:border-white/20"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="intensity"
                        checked={selectedActivityId === a.id}
                        onChange={() => setSelectedActivityId(a.id)}
                      />
                      <span className="text-sm">{intensityLabel(a)}</span>
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {Number(a.estimated_calories_per_unit_frequency).toFixed(2)} cal·{workout.workout_type === "duration" ? "sec" : "rep"}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {workout.workout_type === "duration" ? (
              <Field label="Duration (seconds)">
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className={inputCls}
                />
              </Field>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Field label="Reps">
                  <input type="number" value={reps} onChange={(e) => setReps(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Sets">
                  <input type="number" value={sets} onChange={(e) => setSets(e.target.value)} className={inputCls} />
                </Field>
              </div>
            )}

            <div className="rounded-lg bg-[#0A1020] px-3 py-2 flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-gray-500">Estimated calories</span>
              <span className={`text-sm font-semibold ${theme.tagText}`}>{calories.toFixed(2)} cal</span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={onClose} className="px-4 py-2 text-sm border border-white/10 rounded-lg">Cancel</button>
              <button
                onClick={handleSubmit}
                className={`px-4 py-2 text-sm rounded-lg font-semibold text-white ${theme.btnPrimary}`}
              >
                {editingDraft ? "Update activity" : "Add to plan"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const inputCls =
  "w-full bg-[#0A1020] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-widest text-gray-500 mb-1">{label}</span>
      {children}
    </label>
  );
}
