import { useEffect, useMemo, useState } from "react";
import { listWorkoutActivities } from "../../api/plan_my_week";
import { estimateCalories, intensityLabel } from "../../contexts/plan_my_week_context";
import { ROLE_THEMES } from "../theme";
import { usePlanMyWeek } from "../../contexts/plan_my_week_context";
import { HMSDuration } from "../HMSDuration";

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
  const [duration, setDuration] = useState(editingDraft?.planned_duration ?? 0);

  // Intensity-as-input state. Stays as a string so the user can type freely;
  // the closest stored value is auto-selected as they type, and snaps on blur.
  const [intensityInput, setIntensityInput] = useState(
    editingDraft?.intensity_value != null ? String(editingDraft.intensity_value) : ""
  );
  const [selectedMeasure, setSelectedMeasure] = useState(editingDraft?.intensity_measure ?? "");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listWorkoutActivities(workout.id)
      .then((rows) => {
        if (!alive) return;
        setActivities(rows);
        // Pick a sensible default unit + value once activities load.
        if (rows.length) {
          if (!selectedMeasure) {
            const firstMeasure = rows[0].intensity_measure || "";
            setSelectedMeasure(firstMeasure);
          }
          if (selectedActivityId == null) {
            setSelectedActivityId(rows[0].id);
            if (!intensityInput) {
              setIntensityInput(rows[0].intensity_value != null ? String(rows[0].intensity_value) : "");
            }
          }
        }
      })
      .catch((e) => alive && setError(e?.message || "Failed to load activities"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workout.id]);

  // Distinct intensity_measure values across activities — drives the unit
  // picker layout (text vs dropdown).
  const uniqueMeasures = useMemo(() => {
    const seen = new Set();
    activities.forEach((a) => {
      const m = a.intensity_measure || "";
      if (m) seen.add(m);
    });
    return [...seen];
  }, [activities]);
  const hasMultipleMeasures = uniqueMeasures.length > 1;

  // When multiple measures exist, only consider activities matching the chosen unit.
  const candidateActivities = useMemo(() => {
    if (!hasMultipleMeasures) return activities;
    return activities.filter((a) => (a.intensity_measure || "") === selectedMeasure);
  }, [activities, hasMultipleMeasures, selectedMeasure]);

  // As the user types an intensity value, coerce selection toward the
  // closest stored intensity_value within the candidate set.
  useEffect(() => {
    if (!candidateActivities.length) return;
    const typed = parseFloat(intensityInput);
    if (!Number.isFinite(typed)) {
      setSelectedActivityId(candidateActivities[0].id);
      return;
    }
    let closest = candidateActivities[0];
    let minDiff = Math.abs(Number(closest.intensity_value ?? 0) - typed);
    for (const a of candidateActivities) {
      const diff = Math.abs(Number(a.intensity_value ?? 0) - typed);
      if (diff < minDiff) { minDiff = diff; closest = a; }
    }
    setSelectedActivityId(closest.id);
  }, [intensityInput, candidateActivities]);

  const selected = useMemo(
    () => activities.find((a) => a.id === selectedActivityId) || null,
    [activities, selectedActivityId]
  );

  const handleIntensityBlur = () => {
    if (selected?.intensity_value != null) {
      setIntensityInput(String(selected.intensity_value));
    }
  };

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
      if (!duration) {
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
      planned_duration: workout.workout_type === "duration" ? duration : null,
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
              <div className="flex items-stretch gap-2">
                <input
                  type="number"
                  step="any"
                  value={intensityInput}
                  onChange={(e) => setIntensityInput(e.target.value)}
                  onBlur={handleIntensityBlur}
                  placeholder="Enter intensity"
                  className={`${inputCls} flex-1`}
                  list={`intensity-options-${workout.id}`}
                />
                <datalist id={`intensity-options-${workout.id}`}>
                  {candidateActivities.map((a) => (
                    <option key={a.id} value={a.intensity_value ?? ""} />
                  ))}
                </datalist>
                {hasMultipleMeasures ? (
                  <select
                    value={selectedMeasure}
                    onChange={(e) => setSelectedMeasure(e.target.value)}
                    className={`${inputCls} w-24`}
                  >
                    {uniqueMeasures.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                ) : uniqueMeasures[0] ? (
                  <span className="flex items-center px-3 text-sm text-gray-300 bg-[#0A1020] border border-white/10 rounded-lg">
                    {uniqueMeasures[0]}
                  </span>
                ) : null}
              </div>
              {selected ? (
                <p className="text-[11px] text-gray-500 mt-1">
                  Snaps to nearest tier: <span className={theme.tagText}>{intensityLabel(selected)}</span>
                  {" · "}
                  {Number(selected.estimated_calories_per_unit_frequency).toFixed(2)} cal·{workout.workout_type === "duration" ? "sec" : "rep"}
                </p>
              ) : null}
            </div>

            {workout.workout_type === "duration" ? (
              <Field label="Duration">
                <HMSDuration value={duration} onChange={setDuration} />
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

            {error ? <p className="text-xs text-red-300">{error}</p> : null}

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
