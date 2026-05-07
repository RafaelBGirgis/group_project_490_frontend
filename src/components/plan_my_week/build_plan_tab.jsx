import { useEffect, useMemo, useState } from "react";
import {
  estimateCalories,
  intensityLabel,
  usePlanMyWeek,
} from "../../contexts/plan_my_week_context";
import {
  assignPlanToSelf,
  createWorkoutPlan,
  prescribePlanToClient,
} from "../../api/plan_my_week";
import WorkoutGrid from "./workout_grid";
import ActivityConfig from "./activity_config";
import ScheduleBlocks from "./schedule_blocks";

export default function BuildPlanTab() {
  const { state, dispatch } = usePlanMyWeek();
  const [workoutGridOpen, setWorkoutGridOpen] = useState(false);
  const [pickedWorkout, setPickedWorkout] = useState(null);
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const totalCalories = useMemo(
    () =>
      state.draftPlan.activities.reduce(
        (sum, a) => sum + Number(a.estimated_calories || 0),
        0
      ),
    [state.draftPlan.activities]
  );

  const editingDraft = useMemo(
    () => state.draftPlan.activities.find((a) => a._draft_id === editingDraftId) || null,
    [state.draftPlan.activities, editingDraftId]
  );

  async function handleSave() {
    setError("");
    setSuccess("");
    if (!state.draftPlan.strata_name.trim()) {
      setError("Plan needs a name.");
      return;
    }
    if (!state.draftPlan.activities.length) {
      setError("Add at least one activity to the plan.");
      return;
    }
    setSaving(true);
    try {
      const planResp = await createWorkoutPlan({
        strata_name: state.draftPlan.strata_name.trim(),
        activities: state.draftPlan.activities.map((a) => ({
          workout_activity_id: a.workout_activity_id,
          planned_reps: a.workout_type === "rep" ? Number(a.planned_reps || 0) : null,
          planned_sets: a.workout_type === "rep" ? Number(a.planned_sets || 0) : null,
          planned_duration:
            a.workout_type === "duration" ? Number(a.planned_duration || 0) : null,
        })),
      });
      const newPlanId = planResp?.workout_plan_id ?? planResp?.id;
      if (!newPlanId) throw new Error("Backend did not return a plan id.");

      // If schedule blocks were drafted, schedule the new plan immediately.
      if (state.pendingBlocks.length) {
        const blocks = state.pendingBlocks.map(toApiBlock);
        if (state.role === "coach") {
          if (state.selectedClientId == null) {
            throw new Error("No client selected to prescribe for.");
          }
          await prescribePlanToClient({
            workout_plan_id: newPlanId,
            client_id: state.selectedClientId,
            blocks,
          });
        } else {
          await assignPlanToSelf({ workout_plan_id: newPlanId, blocks });
        }
        setSuccess(
          `Saved plan "${state.draftPlan.strata_name}" and scheduled ${state.pendingBlocks.length} block${state.pendingBlocks.length === 1 ? "" : "s"}.`
        );
      } else {
        setSuccess(`Saved plan "${state.draftPlan.strata_name}".`);
      }
      dispatch({ type: "CLEAR_DRAFT" });
    } catch (e) {
      setError(e?.message || "Failed to save plan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* LEFT — plan details + activities */}
      <section className="lg:col-span-2 space-y-4">
        <div className="rounded-xl border border-white/10 bg-[#0F1729] p-4">
          <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Plan name</label>
          <input
            value={state.draftPlan.strata_name}
            onChange={(e) => dispatch({ type: "SET_PLAN_NAME", name: e.target.value })}
            placeholder="e.g. Upper Body — Push Focus"
            className="w-full bg-[#0A1020] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600"
          />
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0F1729] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-widest text-gray-500">Activities</h2>
            <button
              onClick={() => setWorkoutGridOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-semibold hover:bg-orange-400"
            >
              + Add activity
            </button>
          </div>
          {state.draftPlan.activities.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">
              No activities yet. Click <span className="text-orange-300">+ Add activity</span> to pick a workout.
            </p>
          ) : (
            <ul className="space-y-2">
              {state.draftPlan.activities.map((a) => (
                <li
                  key={a._draft_id}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-[rgba(255,255,255,0.02)] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{a.workout_name}</p>
                    <p className="text-xs text-gray-400">
                      {intensityLabel(a)} ·{" "}
                      {a.workout_type === "duration"
                        ? `${a.planned_duration || 0}s`
                        : `${a.planned_reps || 0}×${a.planned_sets || 0}`}
                      {" · "}
                      ~{a.estimated_calories} cal
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      className="text-blue-300 hover:underline"
                      onClick={() => {
                        setPickedWorkout({
                          id: a.workout_id,
                          name: a.workout_name,
                          workout_type: a.workout_type,
                        });
                        setEditingDraftId(a._draft_id);
                      }}
                    >
                      edit
                    </button>
                    <button
                      className="text-red-300 hover:underline"
                      onClick={() => dispatch({ type: "REMOVE_ACTIVITY", draftId: a._draft_id })}
                    >
                      remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {state.draftPlan.activities.length > 0 ? (
            <div className="text-xs text-gray-500 text-right">
              Total estimated calories: <span className="text-orange-300 font-semibold">{totalCalories.toFixed(2)}</span>
            </div>
          ) : null}
        </div>
      </section>

      {/* RIGHT — schedule blocks + save */}
      <aside className="space-y-4">
        <ScheduleBlocks />

        {error ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
        ) : null}
        {success ? (
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-300">{success}</div>
        ) : null}

        <button
          disabled={saving}
          onClick={handleSave}
          className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900/40 text-sm font-semibold"
        >
          {saving
            ? "Saving…"
            : state.pendingBlocks.length
              ? `Save plan & schedule ${state.pendingBlocks.length} block${state.pendingBlocks.length === 1 ? "" : "s"}`
              : "Save plan"}
        </button>
        <p className="text-xs text-gray-500">
          Plans must be saved before they can be scheduled. Blocks are validated against the
          {state.role === "coach" ? " client's " : " your "}recurring availability — if any
          block falls outside your availability or overlaps an existing booking, the whole save fails.
        </p>
      </aside>

      {workoutGridOpen ? (
        <WorkoutGrid
          onClose={() => setWorkoutGridOpen(false)}
          onPick={(workout) => {
            setPickedWorkout(workout);
            setWorkoutGridOpen(false);
          }}
          allowCreate={state.role === "coach"}
        />
      ) : null}

      {pickedWorkout ? (
        <ActivityConfig
          workout={pickedWorkout}
          editingDraft={editingDraft}
          onClose={() => {
            setPickedWorkout(null);
            setEditingDraftId(null);
          }}
          onSubmit={(activity) => {
            if (editingDraftId) {
              dispatch({ type: "UPDATE_ACTIVITY", draftId: editingDraftId, patch: activity });
            } else {
              dispatch({ type: "ADD_ACTIVITY", activity });
            }
            setPickedWorkout(null);
            setEditingDraftId(null);
          }}
        />
      ) : null}
    </div>
  );

  // helper: convert local block representation → ISO datetimes for the API
  function toApiBlock(b) {
    const start = `${b.date_iso}T${String(b.start_hour).padStart(2, "0")}:00:00`;
    const end =
      b.end_hour >= 24
        ? // shift to next day midnight
          `${addDays(b.date_iso, 1)}T00:00:00`
        : `${b.date_iso}T${String(b.end_hour).padStart(2, "0")}:00:00`;
    return { start_dt: start, end_dt: end };
  }
}

function addDays(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

// also export the helper for reuse by other components
export { addDays };
