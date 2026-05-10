import { useEffect, useMemo, useState } from "react";
import {
  addActivityToPlan,
  deleteWorkoutPlan,
  publishWorkoutPlan,
  removeActivityFromPlan,
  renameWorkoutPlan,
  searchWorkoutPlans,
} from "../../api/plan_my_week";
import { ROLE_THEMES } from "../theme";
import { usePlanMyWeek, intensityLabel } from "../../contexts/plan_my_week_context";
import { formatDuration } from "../../utils/duration";
import WorkoutGrid from "./workout_grid";
import ActivityConfig from "./activity_config";
import ScheduleDialog from "./schedule_dialog";

const PAGE_SIZE = 12;

/**
 * Coach's library of authored plans ("Previous Scripts"). Lets the coach
 * rename, publish/unpublish, edit, and reuse a plan by prescribing it to
 * the currently-selected client. Deletion goes through the same VCS-backed
 * path as client plans — record is hidden, not destroyed, so logged
 * activities remain attributable for caloric bookkeeping.
 */
export default function PrevScriptsTab() {
  const { state } = usePlanMyWeek();
  const theme = ROLE_THEMES.coach;

  const [text, setText] = useState("");
  const [skip, setSkip] = useState(0);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    searchWorkoutPlans({
      text: text.trim() || undefined,
      skip,
      limit: PAGE_SIZE,
      library_source: "self_authored",
    })
      .then((rows) => alive && setPlans(rows))
      .catch((e) => alive && setError(e?.message || "Failed to load scripts"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [text, skip]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-[#0F1729] p-3">
        <input
          value={text}
          onChange={(e) => { setText(e.target.value); setSkip(0); }}
          placeholder="Search your scripts..."
          className="w-full bg-[#0A1020] border border-white/10 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-500 py-8 text-center">Loading...</p>
      ) : plans.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">
          You haven't authored any plans yet. Use <strong>Build Plan</strong> to create one — it'll show up here for reuse.
        </p>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <ScriptCard
              key={plan.id}
              plan={plan}
              theme={theme}
              clientSelected={state.selectedClientId != null}
              isExpanded={expandedId === plan.id}
              onToggle={() => setExpandedId((id) => (id === plan.id ? null : plan.id))}
              onUpdated={(updated) => {
                if (updated === null) {
                  setPlans((ps) => ps.filter((p) => p.id !== plan.id));
                  if (expandedId === plan.id) setExpandedId(null);
                } else {
                  // VCS-backed rename/publish forks the plan and returns a
                  // new id; replace the row by either id (old or new).
                  setPlans((ps) => ps.map((p) => (p.id === plan.id || p.id === updated.id ? updated : p)));
                }
              }}
            />
          ))}
        </div>
      )}

      <footer className="flex items-center justify-between text-xs text-gray-400">
        <span>Page {Math.floor(skip / PAGE_SIZE) + 1}</span>
        <div className="flex gap-2">
          <button
            disabled={skip === 0}
            onClick={() => setSkip(Math.max(0, skip - PAGE_SIZE))}
            className="px-3 py-1 rounded border border-white/10 disabled:opacity-30"
          >
            ← Prev
          </button>
          <button
            disabled={plans.length < PAGE_SIZE}
            onClick={() => setSkip(skip + PAGE_SIZE)}
            className="px-3 py-1 rounded border border-white/10 disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      </footer>
    </div>
  );
}

function ScriptCard({ plan, theme, clientSelected, isExpanded, onToggle, onUpdated }) {
  const [renaming, setRenaming] = useState(false);
  const [nameVal, setNameVal] = useState(plan.strata_name);
  const [renameBusy, setRenameBusy] = useState(false);
  const [renameError, setRenameError] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [publishBusy, setPublishBusy] = useState(false);
  const [addingActivity, setAddingActivity] = useState(false);
  const [pickedWorkout, setPickedWorkout] = useState(null);
  const [scheduling, setScheduling] = useState(false);

  const totalKcal = useMemo(
    () => (plan.activities || []).reduce((s, a) => s + Number(a.estimated_calories || 0), 0),
    [plan.activities]
  );

  async function handleRename() {
    const trimmed = nameVal.trim();
    if (!trimmed || trimmed === plan.strata_name) { setRenaming(false); return; }
    setRenameBusy(true);
    setRenameError("");
    try {
      const updated = await renameWorkoutPlan(plan.id, trimmed);
      onUpdated(updated);
      setRenaming(false);
    } catch (e) {
      setRenameError(e?.message || "Rename failed.");
    } finally {
      setRenameBusy(false);
    }
  }

  async function handleTogglePublish() {
    setPublishBusy(true);
    try {
      const updated = await publishWorkoutPlan(plan.id, !plan.is_public);
      onUpdated(updated);
    } catch (e) {
      alert(e?.message || "Failed to update visibility.");
    } finally {
      setPublishBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(
      `Hide "${plan.strata_name}" from your scripts? Logged activities are kept for caloric bookkeeping.`
    )) return;
    setDeleteBusy(true);
    setDeleteError("");
    try {
      await deleteWorkoutPlan(plan.id);
      onUpdated(null);
    } catch (e) {
      setDeleteError(e?.message || "Delete failed.");
      setDeleteBusy(false);
    }
  }

  async function handleRemoveActivity(activityId) {
    try {
      const updated = await removeActivityFromPlan(plan.id, activityId);
      onUpdated(updated);
    } catch (e) {
      alert(e?.message || "Failed to remove activity.");
    }
  }

  async function handleAddActivity(activityData) {
    try {
      const updated = await addActivityToPlan(plan.id, {
        workout_activity_id: activityData.workout_activity_id,
        planned_reps: activityData.planned_reps ?? null,
        planned_sets: activityData.planned_sets ?? null,
        planned_duration: activityData.planned_duration ?? null,
      });
      onUpdated(updated);
      setAddingActivity(false);
      setPickedWorkout(null);
    } catch (e) {
      alert(e?.message || "Failed to add activity.");
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#0F1729]">
      <div className="flex items-center gap-3 p-4">
        <div className="flex-1 min-w-0">
          {renaming ? (
            <div className="flex gap-2 items-center">
              <input
                autoFocus
                value={nameVal}
                onChange={(e) => setNameVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setRenaming(false); }}
                className="flex-1 bg-[#0A1020] border border-white/10 rounded px-2 py-1 text-sm text-white"
              />
              <button onClick={handleRename} disabled={renameBusy} className={`px-3 py-1 text-xs rounded ${theme.btnPrimary} text-white disabled:opacity-50`}>
                {renameBusy ? "Saving…" : "Save"}
              </button>
              <button onClick={() => setRenaming(false)} className="px-2 py-1 text-xs rounded border border-white/10 text-gray-300">✕</button>
            </div>
          ) : (
            <button onClick={onToggle} className="flex items-center gap-2 text-left w-full min-w-0">
              <span className="text-sm font-semibold text-white truncate">{plan.strata_name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); setRenaming(true); setNameVal(plan.strata_name); }}
                className="text-gray-500 hover:text-orange-300 transition-colors shrink-0"
                title="Rename plan"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.838 2.196a.25.25 0 0 0 .323.323l2.196-.838a2.75 2.75 0 0 0 .892-.596l4.261-4.263a1.75 1.75 0 0 0 0-2.475ZM2.25 5.25a3 3 0 0 1 3-3H7a.75.75 0 0 1 0 1.5H5.25a1.5 1.5 0 0 0-1.5 1.5v5.5a1.5 1.5 0 0 0 1.5 1.5h5.5a1.5 1.5 0 0 0 1.5-1.5V9a.75.75 0 0 1 1.5 0v1.75a3 3 0 0 1-3 3h-5.5a3 3 0 0 1-3-3v-5.5Z" />
                </svg>
              </button>
              <span className="text-[10px] text-gray-500 shrink-0">{plan.activities?.length || 0} activities</span>
              {totalKcal > 0 && (
                <span className={`text-[10px] shrink-0 ${theme.tagText}`}>~{totalKcal.toFixed(0)} kcal</span>
              )}
              <span className={`text-[10px] shrink-0 rounded-full px-1.5 py-0.5 ${plan.is_public ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-gray-500"}`}>
                {plan.is_public ? "Public" : "Private"}
              </span>
            </button>
          )}
          {renameError && <p className="text-xs text-red-300 mt-1">{renameError}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleTogglePublish}
            disabled={publishBusy}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50 ${
              plan.is_public
                ? "border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
                : "border-white/10 text-gray-400 hover:text-white hover:border-white/20"
            }`}
            title={plan.is_public ? "Unpublish (remove from Browse Plans)" : "Publish (list in Browse Plans)"}
          >
            {publishBusy ? "…" : plan.is_public ? "Unpublish" : "Publish"}
          </button>
          <button
            onClick={() => setScheduling(true)}
            disabled={!clientSelected}
            title={clientSelected ? "Prescribe to current client" : "Select a client first"}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold text-white ${theme.btnPrimary} disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            Prescribe
          </button>
          <button
            onClick={onToggle}
            className="text-gray-500 hover:text-white text-lg leading-none"
          >
            {isExpanded ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {deleteError && (
        <p className="px-4 pb-2 text-xs text-red-300">{deleteError}</p>
      )}

      {isExpanded && (
        <div className="border-t border-white/10 p-4 space-y-2">
          {(plan.activities || []).length === 0 ? (
            <p className="text-sm text-gray-500">No activities. Add one below.</p>
          ) : (
            <ul className="space-y-1.5">
              {(plan.activities || []).map((a) => (
                <li key={a.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-[#0A1020] px-3 py-2">
                  <div>
                    <span className="text-sm text-white">{a.workout_name || `Activity #${a.workout_activity_id}`}</span>
                    <span className="text-xs text-gray-400 ml-2">
                      {intensityLabel(a)}
                      {" · "}
                      {a.planned_duration != null
                        ? formatDuration(a.planned_duration)
                        : `${a.planned_reps ?? "—"}×${a.planned_sets ?? "—"}`}
                      {a.estimated_calories != null ? ` · ${Number(a.estimated_calories).toFixed(1)} kcal` : ""}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveActivity(a.id)}
                    className="text-red-400 hover:text-red-300 ml-3 shrink-0"
                    title="Remove activity"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clipRule="evenodd" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => setAddingActivity(true)}
              className={`text-xs font-semibold ${theme.tagText} hover:underline`}
            >
              + Add activity
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteBusy}
              className="text-red-400 hover:text-red-300 disabled:opacity-50"
              title="Hide script (preserves logged activity history)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {addingActivity && (
        <WorkoutGrid
          onClose={() => { setAddingActivity(false); setPickedWorkout(null); }}
          onPick={(workout) => { setPickedWorkout(workout); setAddingActivity(false); }}
          allowCreate={true}
        />
      )}
      {pickedWorkout && (
        <ActivityConfig
          workout={pickedWorkout}
          editingDraft={null}
          onClose={() => setPickedWorkout(null)}
          onSubmit={handleAddActivity}
        />
      )}

      {scheduling && (
        <ScheduleDialog
          plan={plan}
          planName={plan.strata_name}
          mode="browse"
          onClose={() => setScheduling(false)}
        />
      )}
    </div>
  );
}
