import { useMemo, useState } from "react";
import {
  estimateCalories,
  intensityLabel,
  usePlanMyWeek,
} from "../../contexts/plan_my_week_context";
import { formatDuration } from "../../utils/duration";
import {
  assignPlanToSelf,
  createWorkoutPlan,
  prescribePlanToClient,
} from "../../api/plan_my_week";
import { ROLE_THEMES } from "../theme";
import WorkoutGrid from "./workout_grid";
import ActivityConfig from "./activity_config";
import ScheduleDialog from "./schedule_dialog";

export default function BuildPlanTab() {
  const { state, dispatch } = usePlanMyWeek();
  const theme = ROLE_THEMES[state.role] ?? ROLE_THEMES.client;
  const isCoach = state.role === "coach";

  const [workoutGridOpen, setWorkoutGridOpen] = useState(false);
  const [pickedWorkout, setPickedWorkout] = useState(null);
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [configError, setConfigError] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const totalCalories = useMemo(
    () => state.draftPlan.activities.reduce((sum, a) => sum + Number(a.estimated_calories || 0), 0),
    [state.draftPlan.activities]
  );

  const editingDraft = useMemo(
    () => state.draftPlan.activities.find((a) => a._draft_id === editingDraftId) || null,
    [state.draftPlan.activities, editingDraftId]
  );

  function openScheduler() {
    setConfigError("");
    if (!state.draftPlan.strata_name.trim()) {
      setConfigError("Give your plan a name before scheduling.");
      return;
    }
    if (!state.draftPlan.activities.length) {
      setConfigError("Add at least one activity before scheduling.");
      return;
    }
    setScheduleOpen(true);
  }

  async function handleBuildSave(apiBlocks) {
    const planResp = await createWorkoutPlan({
      strata_name: state.draftPlan.strata_name.trim(),
      is_public: isCoach ? isPublic : false,
      activities: state.draftPlan.activities.map((a) => ({
        workout_activity_id: a.workout_activity_id,
        planned_reps: a.workout_type === "rep" ? Number(a.planned_reps || 0) : null,
        planned_sets: a.workout_type === "rep" ? Number(a.planned_sets || 0) : null,
        planned_duration: a.workout_type === "duration" ? Number(a.planned_duration || 0) : null,
      })),
    });
    const newPlanId = planResp?.workout_plan_id ?? planResp?.id;
    if (!newPlanId) throw new Error("Backend did not return a plan id.");

    if (state.role === "coach") {
      if (state.selectedClientId == null) throw new Error("No client selected to prescribe for.");
      await prescribePlanToClient({
        workout_plan_id: newPlanId,
        client_id: state.selectedClientId,
        blocks: apiBlocks,
      });
    } else {
      await assignPlanToSelf({ workout_plan_id: newPlanId, blocks: apiBlocks });
    }
    dispatch({ type: "CLEAR_DRAFT" });
    setScheduleOpen(false);
  }

  return (
    <div className="space-y-4">
      {/* Plan name + public toggle */}
      <div className="rounded-xl border border-white/10 bg-[#0F1729] p-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Plan name</label>
            <input
              value={state.draftPlan.strata_name}
              onChange={(e) => dispatch({ type: "SET_PLAN_NAME", name: e.target.value })}
              placeholder="e.g. Upper Body — Push Focus"
              className="w-full bg-[#0A1020] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600"
            />
          </div>
          {isCoach && (
            <div className="shrink-0 flex flex-col items-center">
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Publish</p>
              <button
                type="button"
                onClick={() => setIsPublic((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isPublic ? theme.btnPrimary : "bg-white/10"
                }`}
                title={isPublic ? "Visible in Browse Plans" : "Private — only you can see it"}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    isPublic ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Activities */}
      <div className="rounded-xl border border-white/10 bg-[#0F1729] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm uppercase tracking-widest text-gray-500">Activities</h2>
          <button
            onClick={() => setWorkoutGridOpen(true)}
            className={`px-3 py-1.5 rounded-lg text-white text-xs font-semibold ${theme.btnPrimary}`}
          >
            + Add activity
          </button>
        </div>
        {state.draftPlan.activities.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">
            No activities yet. Click <span className={theme.tagText}>+ Add activity</span> to pick a workout.
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
                      ? formatDuration(a.planned_duration || 0)
                      : `${a.planned_reps || 0}×${a.planned_sets || 0}`}
                    {" · "}
                    ~{a.estimated_calories} cal
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    className="text-blue-300 hover:underline"
                    onClick={() => {
                      setPickedWorkout({ id: a.workout_id, name: a.workout_name, workout_type: a.workout_type });
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
            Total estimated calories:{" "}
            <span className={`${theme.tagText} font-semibold`}>{totalCalories.toFixed(2)}</span>
          </div>
        ) : null}
      </div>

      {configError ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{configError}</div>
      ) : null}

      <button
        onClick={openScheduler}
        className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white ${theme.btnPrimary}`}
      >
        Next: Schedule →
      </button>

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
          onClose={() => { setPickedWorkout(null); setEditingDraftId(null); }}
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

      {scheduleOpen ? (
        <ScheduleDialog
          plan={null}
          planName={state.draftPlan.strata_name || "New plan"}
          mode="build"
          onBuildSave={handleBuildSave}
          onClose={() => setScheduleOpen(false)}
        />
      ) : null}
    </div>
  );
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

export { addDays };
