import { useEffect, useMemo, useState } from "react";
import {
  copyWorkoutPlan,
  saveWorkoutPlan,
  searchPrescribedPlans,
  searchMyPlans,
  searchPublicPlans,
} from "../../api/plan_my_week";
import { ROLE_THEMES } from "../theme";
import { usePlanMyWeek } from "../../contexts/plan_my_week_context";
import ScheduleDialog from "./schedule_dialog";

const PAGE_SIZE = 12;

/**
 * Browse Plans (PRD v2):
 *
 * Coach view: read-only list of public plans + Schedule (prescribe). No
 *   Save/Copy — coaches cannot pull marketplace plans into their library
 *   (prevents copy-and-republish under their own name).
 *
 * Client view: list of public plans with three actions per card:
 *   - Save: adds to "All Mine"-adjacent saved set; idempotent.
 *   - Copy: forks into "All Mine" with full edit rights.
 *   - Schedule: assigns to client's calendar (existing flow).
 *
 * Cards already in the caller's library are badged so the same plan doesn't
 * look saveable twice.
 */
export default function BrowsePlansTab() {
  const { state } = usePlanMyWeek();
  const theme = ROLE_THEMES[state.role] ?? ROLE_THEMES.client;
  const isCoach = state.role === "coach";

  const [text, setText] = useState("");
  const [skip, setSkip] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scheduling, setScheduling] = useState(null);

  // Library plan ids (client only) so we can badge "Saved" / "In your library"
  // and disable the Save button on cards already present.
  const [libraryIds, setLibraryIds] = useState(() => new Set());
  // Per-card busy state for the new actions.
  const [busy, setBusy] = useState({}); // { [planId]: "save" | "copy" }
  const [toast, setToast] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    searchPublicPlans({ text: text.trim() || undefined, skip, limit: PAGE_SIZE })
      .then((rows) => alive && setItems(rows))
      .catch((e) => alive && setError(e?.message || "Failed to load plans"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [text, skip]);

  // Pull the library id-set on mount (client only). Coaches don't need it.
  useEffect(() => {
    if (isCoach) return;
    let alive = true;
    Promise.all([
      searchMyPlans({ limit: 100 }).catch(() => []),
      searchPrescribedPlans({ limit: 100 }).catch(() => []),
    ]).then(([mine, prescribed]) => {
      if (!alive) return;
      const set = new Set();
      [...(mine || []), ...(prescribed || [])].forEach((p) => set.add(p.id));
      setLibraryIds(set);
    });
    return () => { alive = false; };
  }, [isCoach]);

  const flashToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  async function handleSave(plan) {
    setBusy((b) => ({ ...b, [plan.id]: "save" }));
    try {
      await saveWorkoutPlan(plan.id);
      setLibraryIds((s) => new Set(s).add(plan.id));
      flashToast(`Saved "${plan.strata_name}" to your library.`);
    } catch (e) {
      flashToast(e?.message || "Save failed.");
    } finally {
      setBusy((b) => { const n = { ...b }; delete n[plan.id]; return n; });
    }
  }

  async function handleCopy(plan) {
    setBusy((b) => ({ ...b, [plan.id]: "copy" }));
    try {
      const fork = await copyWorkoutPlan(plan.id);
      setLibraryIds((s) => new Set(s).add(fork?.id ?? plan.id));
      flashToast(`Copied "${plan.strata_name}" into your plans.`);
    } catch (e) {
      flashToast(e?.message || "Copy failed.");
    } finally {
      setBusy((b) => { const n = { ...b }; delete n[plan.id]; return n; });
    }
  }

  const cards = useMemo(() => items, [items]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-[#0F1729] p-3">
        <input
          value={text}
          onChange={(e) => { setText(e.target.value); setSkip(0); }}
          placeholder="Search plans by name..."
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
      ) : cards.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">No plans yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {cards.map((plan) => {
            const inLibrary = libraryIds.has(plan.id);
            const cardBusy = busy[plan.id];
            return (
              <article
                key={plan.id}
                className="rounded-xl border border-white/10 bg-[#0F1729] p-4 flex flex-col"
              >
                <header className="flex items-start justify-between mb-2 gap-2">
                  <h3 className="font-semibold text-white truncate">{plan.strata_name}</h3>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {inLibrary ? (
                      <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 rounded-full px-2 py-0.5">
                        In library
                      </span>
                    ) : null}
                    <span className="text-[10px] text-gray-500">
                      {plan.activities?.length || 0} activities
                    </span>
                  </div>
                </header>
                <ul className="flex-1 space-y-1 text-xs text-gray-400 mb-3">
                  {(plan.activities || []).slice(0, 4).map((a) => (
                    <li key={a.id}>
                      - {a.workout_name || `Activity #${a.workout_activity_id}`}
                      {" - "}
                      {a.intensity_value != null
                        ? `${a.intensity_value}${a.intensity_measure ? ` ${a.intensity_measure}` : ""}`
                        : "-"}
                      {a.planned_duration
                        ? ` · ${a.planned_duration}s`
                        : a.planned_reps && a.planned_sets
                          ? ` · ${a.planned_reps}x${a.planned_sets}`
                          : ""}
                    </li>
                  ))}
                  {(plan.activities?.length || 0) > 4 ? (
                    <li>+ {plan.activities.length - 4} more...</li>
                  ) : null}
                </ul>
                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                  {/* Client-only Save + Copy. Coaches see no library actions. */}
                  {!isCoach ? (
                    <>
                      <button
                        onClick={() => handleSave(plan)}
                        disabled={inLibrary || cardBusy != null}
                        className="px-2.5 py-1 rounded-lg border border-white/10 text-xs font-medium text-slate-300 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
                        title={inLibrary ? "Already in your library" : "Save to library"}
                      >
                        {cardBusy === "save" ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => handleCopy(plan)}
                        disabled={cardBusy != null}
                        className="px-2.5 py-1 rounded-lg border border-white/10 text-xs font-medium text-slate-300 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Copy into your plans (full edit rights)"
                      >
                        {cardBusy === "copy" ? "Copying..." : "Copy"}
                      </button>
                    </>
                  ) : null}
                  <button
                    onClick={() => setScheduling(plan)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold text-white ${theme.btnPrimary}`}
                  >
                    {isCoach ? "Prescribe →" : "Schedule →"}
                  </button>
                </div>
              </article>
            );
          })}
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
            disabled={items.length < PAGE_SIZE}
            onClick={() => setSkip(skip + PAGE_SIZE)}
            className="px-3 py-1 rounded border border-white/10 disabled:opacity-30"
          >
            {"Next ->"}
          </button>
        </div>
      </footer>

      {scheduling ? (
        <ScheduleDialog
          plan={scheduling}
          planName={scheduling.strata_name}
          mode="browse"
          onClose={() => setScheduling(null)}
        />
      ) : null}
    </div>
  );
}
