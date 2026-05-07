import { useState } from "react";
import {
  startDailyStepsSurvey,
  submitDailyStepsSurvey,
  fetchStepHistory,
} from "../../api/survey";

const ACCENT = "#3B82F6";

/**
 * Inline form for submitting today's steps. Mirrors the daily-survey/steps
 * flow (start → submit). Used inside an overlay opened from the dashboard's
 * STEPS TODAY card.
 *
 * Props:
 *   status — daily-steps-survey status object (or null if endpoint is offline)
 *   recent — array of past StepCount entries (newest first), used as a tiny history strip
 *   onSubmitted — called with the response after a successful submit
 */
export default function StepsLog({ status, recent = [], onSubmitted }) {
  const [steps, setSteps] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const finished = Boolean(status?.is_finished);
  const unavailable = status === null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const stepsNum = Number(steps);
    if (!Number.isInteger(stepsNum) || stepsNum < 0 || stepsNum > 100000) {
      setError("Steps must be a whole number between 0 and 100,000.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      if (!status?.is_started) {
        await startDailyStepsSurvey();
      }
      const response = await submitDailyStepsSurvey({ step_count: stepsNum });
      const updatedRecent = await fetchStepHistory({ limit: 7 }).catch(() => []);
      onSubmitted?.(response, updatedRecent);
    } catch (err) {
      setError(err?.message || "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {unavailable && (
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
          <p className="text-xs font-semibold text-yellow-300">Steps survey is offline</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Try again later.</p>
        </div>
      )}

      {!unavailable && (
        <form onSubmit={handleSubmit} className="space-y-3">
          {finished ? (
            <p className="text-xs text-gray-400">
              You've already logged today's steps. Come back tomorrow.
            </p>
          ) : (
            <>
              <label className="text-xs text-gray-300 font-medium block">Steps walked today</label>
              <input
                type="number"
                min={0}
                max={100000}
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                placeholder="e.g. 8500"
                className="w-full bg-[#080D19] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none"
                autoFocus
              />
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-lg text-sm font-bold text-white transition-colors disabled:opacity-40"
                style={{ backgroundColor: ACCENT }}
              >
                {submitting ? "Saving..." : "Submit Steps"}
              </button>
            </>
          )}
        </form>
      )}

      <div>
        <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Past 7 days</p>
        {recent.length === 0 ? (
          <p className="text-[11px] text-gray-600">No previous step entries yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {recent.slice(0, 7).map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between bg-[#080D19] border border-white/5 rounded-lg px-3 py-2 text-xs"
              >
                <span className="text-white font-semibold">
                  {Number(entry.step_count).toLocaleString()} steps
                </span>
                <span className="text-[11px] text-gray-500">
                  {entry.last_updated ? formatDate(entry.last_updated) : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function formatDate(value) {
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}
