import { useState, useEffect } from "react";
import {
  fetchAllDailySurveys,
  startDailyMoodSurvey,
  submitDailyMoodSurvey,
  startDailyBodyMetricsSurvey,
  submitDailyBodyMetricsSurvey,
} from "../../api/survey";
import ProgressPictures from "./progress_pictures";

const ACCENT = "#3B82F6";

const SECTION_KEYS = ["mood", "body_metrics"];

/**
 * Daily check-in overlay body. The user must call /start before /submit, so
 * each section auto-starts when expanded the first time and submits the form
 * data when the user clicks Submit.
 *
 * Props:
 *   onCompleted — called after any successful submission so the dashboard can
 *                 refresh its summary count.
 */
export default function DailySurvey({ onCompleted, picturesStorageKey }) {
  const [statuses, setStatuses] = useState({ mood: null, body_metrics: null });
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState(null);

  useEffect(() => {
    (async () => {
      const all = await fetchAllDailySurveys();
      setStatuses({ mood: all.mood, body_metrics: all.body_metrics });
      setLoading(false);
      const firstAvailableUnfinished = SECTION_KEYS.find(
        (key) => all[key] && !all[key].is_finished,
      );
      setActiveSection(firstAvailableUnfinished ?? null);
    })();
  }, []);

  const handleSubmitted = (key, response) => {
    setStatuses((prev) => ({ ...prev, [key]: response }));
    onCompleted?.();
    const next = SECTION_KEYS.find(
      (k) => k !== key && statuses[k] && !statuses[k].is_finished,
    );
    setActiveSection(next ?? null);
  };

  if (loading) {
    return <p className="text-sm text-gray-400">Loading today's check-in...</p>;
  }

  const allUnavailable = statuses.mood === null && statuses.body_metrics === null;

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
            Quick check-ins for mood and body metrics. Each one logs to your telemetry so
            your coach can see how you're tracking. Steps are logged from the dashboard card.
          </p>

          <SurveySection
            title="Mood &amp; Wellbeing"
            status={statuses.mood}
            expanded={activeSection === "mood"}
            onToggle={() => setActiveSection(activeSection === "mood" ? null : "mood")}
          >
            <MoodForm
              status={statuses.mood}
              onSubmitted={(response) => handleSubmitted("mood", response)}
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
              onSubmitted={(response) => handleSubmitted("body_metrics", response)}
            />
          </SurveySection>
        </>
      )}

      <div className="rounded-xl border border-white/10 bg-[#0A1020] px-4 py-4">
        <ProgressPictures storageKey={picturesStorageKey} />
      </div>
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
      {expanded && !unavailable && !finished && (
        <div className="px-4 pb-4 pt-1">{children}</div>
      )}
      {expanded && !unavailable && finished && (
        <p className="px-4 pb-4 text-xs text-gray-500">
          Submitted earlier today. Come back tomorrow for the next check-in.
        </p>
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

function MoodForm({ status, onSubmitted }) {
  const [happiness, setHappiness] = useState(7);
  const [alertness, setAlertness] = useState(7);
  const [healthiness, setHealthiness] = useState(7);
  const [goals, setGoals] = useState("");
  const [appreciation, setAppreciation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!goals.trim() || !appreciation.trim()) {
      setError("Please fill in both reflections.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      if (!status?.is_started) {
        await startDailyMoodSurvey();
      }
      const response = await submitDailyMoodSurvey({
        happiness_meter: happiness,
        alertness,
        healthiness,
        todays_goals: goals.trim(),
        todays_appreciation: appreciation.trim(),
      });
      onSubmitted(response);
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
        {submitting ? "Saving..." : "Submit Mood Check-in"}
      </button>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Body metrics form
   ═══════════════════════════════════════════════════════════════════════ */

function BodyMetricsForm({ status, onSubmitted }) {
  const [weight, setWeight] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const weightNum = Number(weight);
    if (!Number.isFinite(weightNum) || weightNum <= 0) {
      setError("Enter a positive weight.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      if (!status?.is_started) {
        await startDailyBodyMetricsSurvey();
      }
      const response = await submitDailyBodyMetricsSurvey({ weight: Math.round(weightNum) });
      onSubmitted(response);
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
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="e.g. 175"
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
        {submitting ? "Saving..." : "Submit Body Metrics"}
      </button>
    </form>
  );
}

