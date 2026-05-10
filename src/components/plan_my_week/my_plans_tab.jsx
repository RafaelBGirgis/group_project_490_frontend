import { useEffect, useMemo, useState } from "react";
import {
  addActivityToPlan,
  copyWorkoutPlan,
  deleteWorkoutPlan,
  removeActivityFromPlan,
  renameWorkoutPlan,
  searchMyPlans,
  searchPrescribedPlans,
} from "../../api/plan_my_week";
import { ROLE_THEMES } from "../theme";
import { usePlanMyWeek } from "../../contexts/plan_my_week_context";
import { formatDuration } from "../../utils/duration";
import { intensityLabel } from "../../contexts/plan_my_week_context";
import WorkoutGrid from "./workout_grid";
import ActivityConfig from "./activity_config";
import ScheduleDialog from "./schedule_dialog";

const PAGE_SIZE = 12;

/**
 * PRD v2: client's "My Plans" is split into two subviews.
 *
 *   "All Mine"   — library_source = self_authored. Plans the client built
 *                  from scratch + plans they copied via the Copy-to-own
 *                  action. Full CRUD.
 *   "From Coach" — library_source = prescribed. Read-only. Each card has a
 *                  single "Copy to my plans" action that forks the plan into
 *                  All Mine for the client to edit.
 *
 * Coaches don't see this tab — they see Previous Scripts instead.
 */
export default function MyPlansTab() {
  const { state } = usePlanMyWeek();
  const theme = ROLE_THEMES[state.role] ?? ROLE_THEMES.client;

  const [activeView, setActiveView] = useState("self_authored"); // "self_authored" | "prescribed"
  const [text, setText] = useState("");
  const [skip, setSkip] = useState(0);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    const fn = activeView === "prescribed" ? searchPrescribedPlans : searchMyPlans;
    fn({ text: text.trim() || undefined, skip, limit: PAGE_SIZE })
      .then((rows) => alive && setPlans(rows))
      .catch((e) => alive && setError(e?.message || "Failed to load plans"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [activeView, text, skip]);

  // Reset page + collapse on subview switch.
  useEffect(() => {
    setSkip(0);
    setExpandedId(null);
  }, [activeView]);

  const flashToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  return (
    <div className="space-y-4">
      {/* Subview switcher */}
      <div className="flex gap-2 border-b border-white/10">
        {[
          { key: "self_authored", label: "All Mine" },
          { key: "prescribed", label: "From Coach" },
        ].map((v) => (
          <button
            key={v.key}
            onClick={() => setActiveView(v.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeView === v.key ? theme.tagText : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
            style={activeView === v.key ? { borderColor: theme.accent } : undefined}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-[#0F1729] p-3">
        <input
          value={text}
          onChange={(e) => { setText(e.target.value); setSkip(0); }}
          placeholder={activeView === "prescribed" ? "Search prescribed plans..." : "Search your plans..."}
          className="w-full bg-[#0A1020] border border-white/10 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {toast ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          {toast}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-500 py-8 text-center">Loading...</p>
      ) : plans.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">
          {activeView === "prescribed"
            ? "No plans from coaches yet. When your coach prescribes a plan it'll show up here."
            : (
              <>
                No plans yet. Use <strong>Build Plan</strong> to create one, or
                copy a plan from <strong>Browse Plans</strong> / <strong>From Coach</strong>.
              </>
            )}
        </p>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            activeView === "prescribed" ? (
              <PrescribedPlanCard
                key={plan.id}
                plan={plan}
                theme={theme}
                isExpanded={expandedId === plan.id}
                onToggle={() => setExpandedId((id) => (id === plan.id ? null : plan.id))}
                onCopied={(forkId, name) => {
                  flashToast(`Copied "${name}" into All Mine.`);
                  // Auto-switch to All Mine after a copy succeeds so the user sees the fork.
                  setTimeout(() => setActiveView("self_authored"), 600);
                }}
              />
            ) : (
              <PlanCard
                key={plan.id}
                plan={plan}
                theme={theme}
                isExpanded={expandedId === plan.id}
                onToggle={() => setExpandedId((id) => (id === plan.id ? null : plan.id))}
                onUpdated={(updated) => {
                  if (updated === null) {
                    setPlans((ps) => ps.filter((p) => p.id !== plan.id));
                    if (expandedId === plan.id) setExpandedId(null);
                  } else {
                    setPlans((ps) => ps.map((p) => (p.id === updated.id ? updated : p)));
                  }
                }}
              />
            )
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
            {"<- Prev"}
          </button>
          <button
            disabled={plans.length < PAGE_SIZE}
            onClick={() => setSkip(skip + PAGE_SIZE)}
            className="px-3 py-1 rounded border border-white/10 disabled:opacity-30"
          >
            {"Next ->"}
          </button>
        </div>
      </footer>
    </div>
  );
}

/* ─── Read-only From Coach card ───────────────────────────────────────────── */

function PrescribedPlanCard({ plan, theme, isExpanded, onToggle, onCopied }) {
  const [copyBusy, setCopyBusy] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [scheduling, setScheduling] = useState(false);

  const totalKcal = useMemo(
    () => (plan.activities || []).reduce((s, a) => s + Number(a.estimated_calories || 0), 0),
    [plan.activities]
  );

  async function handleCopy() {
    setCopyBusy(true);
    setCopyError("");
    try {
      const fork = await copyWorkoutPlan(plan.id);
      onCopied?.(fork?.id, plan.strata_name);
    } catch (e) {
      setCopyError(e?.message || "Copy failed.");
    } finally {
      setCopyBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#0F1729]">
      <div className="flex items-center gap-3 p-4">
        <div className="flex-1 min-w-0">
          <button onClick={onToggle} className="flex items-center gap-2 text-left w-full min-w-0">
            <span className="text-sm font-semibold text-white truncate">{plan.strata_name}</span>
            <span className="text-[10px] shrink-0 rounded-full px-1.5 py-0.5 bg-amber-500/15 text-amber-300">
              From Coach
            </span>
            <span className="text-[10px] text-gray-500 shrink-0">{plan.activities?.length || 0} activities</span>
            {totalKcal > 0 && (
              <span className={`text-[10px] shrink-0 ${theme.tagText}`}>~{totalKcal.toFixed(0)} kcal</span>
            )}
          </button>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopy}
            disabled={copyBusy}
            className="px-2.5 py-1 rounded-lg border border-white/10 text-xs font-medium text-slate-300 hover:bg-white/5 disabled:opacity-50"
            title="Copy into your plans for editing"
          >
            {copyBusy ? "Copying..." : "Copy"}
          </button>
          <button
            onClick={() => setScheduling(true)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold text-white ${theme.btnPrimary}`}
          >
            Schedule
          </button>
          <button onClick={onToggle} className="text-gray-500 hover:text-white text-lg leading-none">
            {isExpanded ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {copyError ? (
        <p className="px-4 pb-2 text-xs text-red-300">{copyError}</p>
      ) : null}

      {isExpanded && (
        <div className="border-t border-white/10 p-4">
          {(plan.activities || []).length === 0 ? (
            <p className="text-sm text-gray-500">No activities.</p>
          ) : (
            <ul className="space-y-1.5">
              {(plan.activities || []).map((a) => (
                <li key={a.id} className="rounded-lg border border-white/5 bg-[#0A1020] px-3 py-2">
                  <span className="text-sm text-white">{a.workout_name || `Activity #${a.workout_activity_id}`}</span>
                  <span className="text-xs text-gray-400 ml-2">
                    {intensityLabel(a)}
                    {" · "}
                    {a.planned_duration != null
                      ? formatDuration(a.planned_duration)
                      : `${a.planned_reps ?? "—"}×${a.planned_sets ?? "—"}`}
                    {a.estimated_calories != null ? ` · ${Number(a.estimated_calories).toFixed(1)} kcal` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-slate-500 mt-3 italic">
            This plan is read-only. Click <strong>Copy</strong> to edit your own version.
          </p>
        </div>
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

/* ─── All Mine card (full CRUD; same shape as previous my_plans_tab) ────── */

function PlanCard({ plan, theme, isExpanded, onToggle, onUpdated }) {
  const [renaming, setRenaming] = useState(false);
  const [nameVal, setNameVal] = useState(plan.strata_name);
  const [renameBusy, setRenameBusy] = useState(false);
  const [renameError, setRenameError] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
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

  async function handleDelete() {
    if (!window.confirm(`Delete "${plan.strata_name}"? Logged activities are preserved (the plan will be archived if any exist).`)) return;
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
              <button onClick={handleRename} disabled={renameBusy} className="px-3 py-1 text-xs rounded bg-blue-600 text-white disabled:opacity-50">
                {renameBusy ? "Saving…" : "Save"}
              </button>
              <button onClick={() => setRenaming(false)} className="px-2 py-1 text-xs rounded border border-white/10 text-gray-300">
                ✕
              </button>
            </div>
          ) : (
            <button onClick={onToggle} className="flex items-center gap-2 text-left w-full min-w-0">
              <span className="text-sm font-semibold text-white truncate">{plan.strata_name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); setRenaming(true); setNameVal(plan.strata_name); }}
                className="text-gray-500 hover:text-blue-300 transition-colors shrink-0"
                title="Rename plan"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.838 2.196a.25.25 0 0 0 .323.323l2.196-.838a2.75 2.75 0 0 0 .892-.596l4.261-4.263a1.75 1.75 0 0 0 0-2.475ZM2.25 5.25a3 3 0 0 1 3-3H7a.75.75 0 0 1 0 1.5H5.25a1.5 1.5 0 0 0-1.5 1.5v5.5a1.5 1.5 0 0 0 1.5 1.5h5.5a1.5 1.5 0 0 0 1.5-1.5V9a.75.75 0 0 1 1.5 0v1.75a3 3 0 0 1-3 3h-5.5a3 3 0 0 1-3-3v-5.5Z" />
                </svg>
              </button>
              {plan.is_forked ? (
                <span className="text-[10px] shrink-0 rounded-full px-1.5 py-0.5 bg-purple-500/15 text-purple-300" title="Copied from another plan">
                  Forked
                </span>
              ) : null}
              <span className="text-[10px] text-gray-500 shrink-0">{plan.activities?.length || 0} activities</span>
              {totalKcal > 0 && (
                <span className={`text-[10px] shrink-0 ${theme.tagText}`}>~{totalKcal.toFixed(0)} kcal</span>
              )}
            </button>
          )}
          {renameError && <p className="text-xs text-red-300 mt-1">{renameError}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setScheduling(true)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold text-white ${theme.btnPrimary}`}
          >
            Schedule
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
              title="Delete plan"
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
          allowCreate={false}
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
