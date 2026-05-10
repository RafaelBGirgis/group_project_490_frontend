import { useState, useEffect } from "react";
import {
  fetchAllDailySurveys,
  startDailyMoodSurvey,
  submitDailyMoodSurvey,
  startDailyBodyMetricsSurvey,
  submitDailyBodyMetricsSurvey,
  fetchMoodHistory,
  fetchWeightHistory,
} from "../../api/survey";
import ProgressPictures from "./progress_pictures";

const ACCENT = "#3B82F6";

// Sections shown inside the overlay. Steps has its own dashboard card and
// isn't part of this flow.
const SECTION_KEYS = ["mood", "body_metrics", "progress_pic"];

// True when an entry's last_updated/created_at falls on today's local date.
function isFromToday(entry) {
  const ts = entry?.last_updated || entry?.created_at;
  if (!ts) return false;
  try {
    const d = new Date(ts);
    const t = new Date();
    return d.getFullYear() === t.getFullYear()
      && d.getMonth() === t.getMonth()
      && d.getDate() === t.getDate();
  } catch { return false; }
}

/**
 * Daily check-in overlay body.
 *
 * The backend submit endpoints upsert (POST /submit will overwrite an existing
 * CompletedSurvey or HealthMetrics row tied to the same daily survey), so once
 * a section is finished the form stays editable — the action button just
 * relabels to "Update". For mood and body metrics we prefill today's prior
 * values from telemetry history. Progress pictures get their own section
 * sourced from /progress_pictures (no daily-survey table for them).
 *
 * Props:
 *   onCompleted — called after any successful submission so the dashboard can
 *                 refresh its summary count.
 */
export default function DailySurvey({ onCompleted }) {
  const [statuses, setStatuses] = useState({
    mood: null,
    body_metrics: null,
    progress_pic: null,
  });
  const [todaysMood, setTodaysMood] = useState(null);
  const [todaysWeight, setTodaysWeight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState(null);

  const reload = async () => {
    const [all, moodHist, weightHist] = await Promise.all([
      fetchAllDailySurveys(),
      fetchMoodHistory({ limit: 1 }).catch(() => []),
      fetchWeightHistory({ limit: 1 }).catch(() => []),
    ]);
    setStatuses({
      mood: all.mood,
      body_metrics: all.body_metrics,
      progress_pic: all.progress_pic,
    });
    setTodaysMood(moodHist?.[0] && isFromToday(moodHist[0]) ? moodHist[0] : null);
    setTodaysWeight(weightHist?.[0] && isFromToday(weightHist[0]) ? weightHist[0] : null);
    return all;
  };

  useEffect(() => {
    (async () => {
      const all = await reload();
      setLoading(false);
      const firstAvailableUnfinished = SECTION_KEYS.find(
        (key) => all[key] && !all[key].is_finished,
      );
      setActiveSection(firstAvailableUnfinished ?? null);
    })();
  }, []);

  const handleSubmitted = async () => {
    // Re-fetch so the status badges + prefilled values reflect the new server
    // truth (rather than constructing a partial response client-side).
    await reload();
    onCompleted?.();
  };

  if (loading) {
    return <p className="text-sm text-gray-400">Loading today's check-in...</p>;
  }

  const allUnavailable = SECTION_KEYS.every((k) => statuses[k] === null);

  return (
    <div className="space-y-4">
      {allUnavailable ? (
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-4">
          <p className="text-sm font-semibold text-yellow-300 mb-1">Check-in is offline</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            The daily survey endpoints aren't reachable right now. Please try again later.
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-400 leading-relaxed">
            Quick check-ins for mood, body metrics, and your daily progress picture. Already
            submitted today? Open any section to edit it — your update overwrites today's entry.
          </p>

          <SurveySection
            title="Mood &amp; Wellbeing"
            status={statuses.mood}
            expanded={activeSection === "mood"}
            onToggle={() => setActiveSection(activeSection === "mood" ? null : "mood")}
          >
            <MoodForm
              status={statuses.mood}
              prior={todaysMood}
              onSubmitted={handleSubmitted}
            />
          </SurveySection>

          <SurveySection
            title="Body Metrics"
            status={statuses.body_metrics}
            expanded={activeSection === "body_metrics"}
            onToggle={() =>
              setActiveSection(activeSection === "body_metrics" ? null : "body_metrics")
            }
          >
            <BodyMetricsForm
              status={statuses.body_metrics}
              prior={todaysWeight}
              onSubmitted={handleSubmitted}
            />
          </SurveySection>

          <SurveySection
            title="Progress Picture"
            status={statuses.progress_pic}
            expanded={activeSection === "progress_pic"}
            onToggle={() =>
              setActiveSection(activeSection === "progress_pic" ? null : "progress_pic")
            }
          >
            <ProgressPictures
              accent={ACCENT}
              onChanged={handleSubmitted}
            />
          </SurveySection>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Section wrapper with status badge + expand/collapse
   ═══════════════════════════════════════════════════════════════════════ */

function SurveySection({ title, status, expanded, onToggle, children }) {
  const unavailable = status === null;
  const finished = Boolean(status?.is_finished);
  const badge = unavailable
    ? "Unavailable"
    : finished
      ? "Done"
      : status?.is_started
        ? "In progress"
        : "Not started";
  const badgeColor = unavailable
    ? "bg-red-500/15 text-red-400"
    : finished
      ? "bg-green-500/15 text-green-400"
      : status?.is_started
        ? "bg-yellow-500/15 text-yellow-400"
        : "bg-white/5 text-gray-400";

  return (
    <div className="rounded-xl border border-white/10 bg-[#0A1020]">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-white font-semibold text-sm">{title}</h3>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${badgeColor}`}>
            {badge}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && unavailable && (
        <p className="px-4 pb-4 text-xs text-gray-400">
          This check-in isn't reachable right now. Try again later — your other sections will still work.
        </p>
      )}
      {/* Always render the form when expanded (and the section is reachable),
          so users can edit a finished entry. The form internally relabels its
          submit button to "Update" once is_finished is true. */}
      {expanded && !unavailable && (
        <div className="px-4 pb-4 pt-1">{children}</div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Reusable bits
   ═══════════════════════════════════════════════════════════════════════ */

function MeterRow({ label, value, onChange }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-gray-300 font-medium">{label}</label>
        <span className="text-xs font-bold" style={{ color: ACCENT }}>
          {value}/10
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-500"
      />
    </div>
  );
}

function ErrorMessage({ message }) {
  if (!message) return null;
  return <p className="text-xs text-red-400 mt-2">{message}</p>;
}

/* ═══════════════════════════════════════════════════════════════════════
   Mood / wellbeing form
   ═══════════════════════════════════════════════════════════════════════ */

function MoodForm({ status, prior, onSubmitted }) {
  // Prefill from today's submitted CompletedSurvey row when present, so editing
  // shows the user what they previously logged rather than the default 7s.
  const [happiness, setHappiness] = useState(prior?.happiness_meter ?? 7);
  const [alertness, setAlertness] = useState(prior?.alertness ?? 7);
  const [healthiness, setHealthiness] = useState(prior?.healthiness ?? 7);
  const [goals, setGoals] = useState(prior?.todays_goals ?? "");
  const [appreciation, setAppreciation] = useState(prior?.todays_appreciation ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Re-sync when a new prior arrives (parent reloaded after a submit).
  useEffect(() => {
    if (prior) {
      setHappiness(prior.happiness_meter ?? 7);
      setAlertness(prior.alertness ?? 7);
      setHealthiness(prior.healthiness ?? 7);
      setGoals(prior.todays_goals ?? "");
      setAppreciation(prior.todays_appreciation ?? "");
    }
  }, [prior]);

  const isUpdate = Boolean(status?.is_finished);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!goals.trim() || !appreciation.trim()) {
      setError("Please fill in both reflections.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      // /start is idempotent server-side; calling it after the survey is
      // finished is a no-op. Only call it if we haven't started yet.
      if (!status?.is_started) {
        await startDailyMoodSurvey();
      }
      await submitDailyMoodSurvey({
        happiness_meter: happiness,
        alertness,
        healthiness,
        todays_goals: goals.trim(),
        todays_appreciation: appreciation.trim(),
      });
      onSubmitted();
    } catch (err) {
      setError(err?.message || "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <MeterRow label="Happiness" value={happiness} onChange={setHappiness} />
      <MeterRow label="Alertness" value={alertness} onChange={setAlertness} />
      <MeterRow label="Healthiness" value={healthiness} onChange={setHealthiness} />

      <div>
        <label className="text-xs text-gray-300 font-medium block mb-1">Today's goal</label>
        <textarea
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
          rows={2}
          placeholder="What do you want to accomplish?"
          className="w-full bg-[#080D19] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none resize-none"
        />
      </div>

      <div>
        <label className="text-xs text-gray-300 font-medium block mb-1">
          Something you're grateful for
        </label>
        <textarea
          value={appreciation}
          onChange={(e) => setAppreciation(e.target.value)}
          rows={2}
          placeholder="A win, a person, an idea..."
          className="w-full bg-[#080D19] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none resize-none"
        />
      </div>

      <ErrorMessage message={error} />

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-2.5 rounded-lg text-sm font-bold text-white transition-colors disabled:opacity-40"
        style={{ backgroundColor: ACCENT }}
      >
        {submitting
          ? "Saving..."
          : isUpdate
            ? "Update Mood Check-in"
            : "Submit Mood Check-in"}
      </button>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Body metrics form
   ═══════════════════════════════════════════════════════════════════════ */

function BodyMetricsForm({ status, prior, onSubmitted }) {
  const [weight, setWeight] = useState(prior?.weight != null ? String(prior.weight) : "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (prior?.weight != null) setWeight(String(prior.weight));
  }, [prior]);

  const isUpdate = Boolean(status?.is_finished);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const weightNum = Number(weight);
    // Mirror the backend validator (HealthMetrics.weight must be 1–600).
    // Frontend pre-rejects out-of-range values so we don't round-trip a
    // 400 just to say "weight too high".
    if (!Number.isFinite(weightNum) || weightNum < 1 || weightNum > 600) {
      setError("Weight must be between 1 and 600 lbs.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      if (!status?.is_started) {
        await startDailyBodyMetricsSurvey();
      }
      await submitDailyBodyMetricsSurvey({ weight: Math.round(weightNum) });
      onSubmitted();
    } catch (err) {
      setError(err?.message || "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="text-xs text-gray-300 font-medium block mb-1">Weight (lbs)</label>
        <input
          type="number"
          min={1}
          max={600}
          step={1}
          inputMode="numeric"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="e.g. 175 (1–600 lbs)"
          className="w-full bg-[#080D19] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none"
        />
      </div>

      <ErrorMessage message={error} />

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-2.5 rounded-lg text-sm font-bold text-white transition-colors disabled:opacity-40"
        style={{ backgroundColor: ACCENT }}
      >
        {submitting
          ? "Saving..."
          : isUpdate
            ? "Update Body Metrics"
            : "Submit Body Metrics"}
      </button>
    </form>
  );
}
