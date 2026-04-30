import { useEffect, useMemo, useState } from "react";
import { fetchTelemetryHistory, fetchWorkoutHistory } from "../../api/survey";

/**
 * Inline-SVG charts visualizing the client's telemetry history.
 * Pulls from the backend telemetry query endpoints (steps / weights / moods /
 * workouts) and renders simple line + bar charts. No external chart deps.
 *
 * Props:
 *   accent — accent colour for the primary series (defaults to dashboard blue).
 */
export default function TelemetryCharts({ accent = "#3B82F6" }) {
  const [history, setHistory] = useState({ moods: [], weights: [], steps: [] });
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [hist, wk] = await Promise.all([
        fetchTelemetryHistory({ limit: 60 }),
        fetchWorkoutHistory({ limit: 60 }),
      ]);
      if (cancelled) return;
      setHistory(hist);
      setWorkouts(wk);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // The telemetry endpoints return newest-first; charts read left→right
  // chronologically so reverse the slices.
  const weightSeries = useMemo(
    () =>
      [...(history.weights || [])]
        .reverse()
        .map((row) => ({
          value: Number(row.weight) || 0,
          label: row.last_updated,
        }))
        .filter((p) => p.value > 0),
    [history.weights],
  );

  const stepsSeries = useMemo(
    () =>
      [...(history.steps || [])]
        .reverse()
        .map((row) => ({ value: Number(row.step_count) || 0, label: row.last_updated })),
    [history.steps],
  );

  const moodSeries = useMemo(
    () =>
      [...(history.moods || [])].reverse().map((row) => ({
        label: row.last_updated || row.id,
        happiness: Number(row.happiness_meter) || 0,
        alertness: Number(row.alertness) || 0,
        healthiness: Number(row.healthiness) || 0,
      })),
    [history.moods],
  );

  const workoutsByDay = useMemo(() => groupByDay(workouts), [workouts]);

  if (loading) {
    return <p className="text-sm text-slate-400">Loading your progress...</p>;
  }

  const allEmpty =
    weightSeries.length === 0 &&
    stepsSeries.length === 0 &&
    moodSeries.length === 0 &&
    workoutsByDay.length === 0;

  if (allEmpty) {
    return (
      <p className="text-sm text-slate-400">
        No telemetry yet. Submit a few daily check-ins and your progress charts will show up here.
      </p>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <ChartCard
        title="Weight"
        unit="lbs"
        series={weightSeries}
        accent={accent}
        emptyText="No weight entries yet."
      >
        {weightSeries.length > 0 && <LineChart points={weightSeries} accent={accent} />}
      </ChartCard>

      <ChartCard
        title="Steps"
        unit="steps/day"
        series={stepsSeries}
        accent={accent}
        emptyText="No step entries yet."
      >
        {stepsSeries.length > 0 && <BarChart points={stepsSeries} accent={accent} />}
      </ChartCard>

      <ChartCard
        title="Mood Trends"
        unit="1–10"
        series={moodSeries}
        accent={accent}
        emptyText="No mood entries yet."
        wide
      >
        {moodSeries.length > 0 && <MoodChart points={moodSeries} accent={accent} />}
      </ChartCard>

      <ChartCard
        title="Completed Workouts"
        unit="per day"
        series={workoutsByDay}
        accent={accent}
        emptyText="No completed workouts yet."
      >
        {workoutsByDay.length > 0 && (
          <BarChart points={workoutsByDay.map((d) => ({ value: d.value, label: d.day }))} accent={accent} />
        )}
      </ChartCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Chart shell: header with summary stats + svg body
   ═══════════════════════════════════════════════════════════════════════ */

function ChartCard({ title, unit, series, accent, emptyText, children, wide = false }) {
  const empty = !series || series.length === 0;
  const numericValues = useMemo(() => {
    if (empty) return [];
    if (typeof series[0]?.value === "number") return series.map((p) => p.value);
    if (typeof series[0]?.happiness === "number") {
      return series.flatMap((p) => [p.happiness, p.alertness, p.healthiness].filter(Number.isFinite));
    }
    return [];
  }, [series, empty]);

  const latest = numericValues.length > 0 ? numericValues[numericValues.length - 1] : null;
  const avg =
    numericValues.length > 0
      ? Math.round((numericValues.reduce((a, b) => a + b, 0) / numericValues.length) * 10) / 10
      : null;

  return (
    <div
      className={`rounded-xl border border-white/6 bg-[#101827] p-4 ${wide ? "md:col-span-2" : ""}`}
    >
      <div className="flex items-end justify-between gap-3 mb-3">
        <div>
          <p className="text-xs font-semibold text-white">{title}</p>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-0.5">{unit}</p>
        </div>
        {!empty && (
          <div className="flex gap-3 text-right">
            {latest != null && (
              <div>
                <p className="text-[10px] text-slate-500">Latest</p>
                <p className="text-sm font-bold" style={{ color: accent }}>
                  {formatNumber(latest)}
                </p>
              </div>
            )}
            {avg != null && (
              <div>
                <p className="text-[10px] text-slate-500">Avg</p>
                <p className="text-sm font-bold text-slate-300">{formatNumber(avg)}</p>
              </div>
            )}
          </div>
        )}
      </div>
      {empty ? <p className="text-xs text-slate-500">{emptyText}</p> : children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Line chart — single series with smooth-ish polyline + filled area
   ═══════════════════════════════════════════════════════════════════════ */

function LineChart({ points, accent, width = 480, height = 140 }) {
  const layout = useChartLayout(points, width, height);
  if (!layout) return null;

  const polyline = layout.coords.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPolygon = `0,${height} ${polyline} ${width},${height}`;
  const gradId = `line-grad-${accent.replace("#", "")}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <GridLines width={width} height={height} />
      <polygon points={areaPolygon} fill={`url(#${gradId})`} />
      <polyline
        points={polyline}
        fill="none"
        stroke={accent}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {layout.coords.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={accent} />
      ))}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Bar chart — discrete daily/per-entry values
   ═══════════════════════════════════════════════════════════════════════ */

function BarChart({ points, accent, width = 480, height = 140 }) {
  if (!points || points.length === 0) return null;
  const padding = 6;
  const innerHeight = height - 16;
  const max = Math.max(...points.map((p) => p.value), 1);
  const barWidth = Math.max((width - padding * 2) / points.length - 2, 2);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32">
      <GridLines width={width} height={height} />
      {points.map((p, i) => {
        const barHeight = max === 0 ? 0 : (p.value / max) * innerHeight;
        const x = padding + i * (barWidth + 2);
        const y = innerHeight - barHeight + 4;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barWidth}
            height={Math.max(barHeight, 1)}
            rx="2"
            fill={accent}
            opacity={0.85}
          />
        );
      })}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Mood chart — three series on a fixed 0–10 scale with a legend
   ═══════════════════════════════════════════════════════════════════════ */

function MoodChart({ points, accent, width = 720, height = 160 }) {
  if (!points || points.length === 0) return null;
  const padding = 8;
  const innerHeight = height - 24;
  const max = 10;

  const xFor = (i) =>
    points.length === 1
      ? width / 2
      : padding + (i * (width - padding * 2)) / (points.length - 1);
  const yFor = (v) => innerHeight - (v / max) * innerHeight + 4;

  const series = [
    { key: "happiness", color: accent, label: "Happiness" },
    { key: "alertness", color: "#10B981", label: "Alertness" },
    { key: "healthiness", color: "#F59E0B", label: "Healthiness" },
  ];

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-36">
        <GridLines width={width} height={height} rows={4} />
        {series.map((s) => {
          const polyline = points.map((p, i) => `${xFor(i)},${yFor(p[s.key])}`).join(" ");
          return (
            <g key={s.key}>
              <polyline
                points={polyline}
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {points.map((p, i) => (
                <circle key={i} cx={xFor(i)} cy={yFor(p[s.key])} r="2" fill={s.color} />
              ))}
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-3 mt-2">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-[10px] text-slate-400">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════════ */

function GridLines({ width, height, rows = 3 }) {
  const lines = [];
  for (let i = 1; i < rows; i++) {
    const y = (i / rows) * (height - 8) + 4;
    lines.push(<line key={i} x1="0" y1={y} x2={width} y2={y} stroke="#1e293b" strokeWidth="1" />);
  }
  return <g>{lines}</g>;
}

function useChartLayout(points, width, height) {
  return useMemo(() => {
    if (!points || points.length === 0) return null;
    const values = points.map((p) => p.value);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;
    const padding = 8;
    const innerWidth = width - padding * 2;
    const innerHeight = height - 16;

    const coords = points.map((p, i) => {
      const x =
        points.length === 1
          ? width / 2
          : padding + (i * innerWidth) / (points.length - 1);
      const y = innerHeight - ((p.value - min) / range) * innerHeight + 4;
      return { x, y };
    });

    return { coords, max, min };
  }, [points, width, height]);
}

function groupByDay(workouts) {
  const byDay = new Map();
  (workouts || []).forEach((w) => {
    const ts = w.last_updated || w.created_at;
    if (!ts) return;
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return;
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) || 0) + 1);
  });
  return [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, count]) => ({ day, value: count }));
}

function formatNumber(value) {
  if (typeof value !== "number") return String(value ?? "—");
  if (value >= 1000) return value.toLocaleString();
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}
