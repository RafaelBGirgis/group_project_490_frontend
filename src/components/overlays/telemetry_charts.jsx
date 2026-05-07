import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteWeightEntry,
  fetchTelemetryHistory,
  fetchWorkoutHistory,
  updateWeightEntry,
} from "../../api/survey";

const WEEK = 7; // records per page

/**
 * Inline-SVG charts visualizing the client's telemetry history.
 * Steps and Mood charts are paginated (7 records / page), with Y-axis
 * scale labels, X-axis dates, and hover tooltips.
 */
export default function TelemetryCharts({ accent = "#3B82F6" }) {
  const [history, setHistory] = useState({ moods: [], weights: [], steps: [] });
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingWeightId, setEditingWeightId] = useState(null);
  const [editingWeightValue, setEditingWeightValue] = useState("");
  const [weightActionError, setWeightActionError] = useState("");
  const [weightActionLoading, setWeightActionLoading] = useState(false);

  const refreshTelemetry = useCallback(async (cancelled = false) => {
    const [hist, wk] = await Promise.all([
      fetchTelemetryHistory({ limit: 90 }),
      fetchWorkoutHistory({ limit: 60 }),
    ]);
    if (cancelled) return;
    setHistory(hist);
    setWorkouts(wk);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refreshTelemetry(cancelled);
    })();
    return () => { cancelled = true; };
  }, [refreshTelemetry]);

  const handleSaveWeight = async (entry) => {
    const nextWeight = Number(editingWeightValue);
    if (!Number.isFinite(nextWeight) || nextWeight <= 0) {
      setWeightActionError("Weight must be a positive number.");
      return;
    }
    setWeightActionLoading(true);
    setWeightActionError("");
    try {
      await updateWeightEntry(entry.id, { weight: Math.round(nextWeight) });
      setEditingWeightId(null);
      setEditingWeightValue("");
      await refreshTelemetry();
    } catch (error) {
      setWeightActionError(error?.message || "Unable to update that weight entry.");
    } finally {
      setWeightActionLoading(false);
    }
  };

  const handleDeleteWeight = async (entryId) => {
    setWeightActionLoading(true);
    setWeightActionError("");
    try {
      await deleteWeightEntry(entryId);
      if (editingWeightId === entryId) {
        setEditingWeightId(null);
        setEditingWeightValue("");
      }
      await refreshTelemetry();
    } catch (error) {
      setWeightActionError(error?.message || "Unable to delete that weight entry.");
    } finally {
      setWeightActionLoading(false);
    }
  };

  // newest-first → reverse for chronological order (oldest left)
  const weightSeries = useMemo(
    () =>
      [...(history.weights || [])]
        .reverse()
        .map((row) => ({
          value: Number(row.weight) || 0,
          date: formatDateLabel(row.last_updated),
        }))
        .filter((p) => p.value > 0),
    [history.weights],
  );

  const stepsSeries = useMemo(
    () =>
      [...(history.steps || [])]
        .reverse()
        .map((row) => ({
          value: Number(row.step_count) || 0,
          date: formatDateLabel(row.last_updated),
        })),
    [history.steps],
  );

  const moodSeries = useMemo(
    () =>
      [...(history.moods || [])]
        .reverse()
        .map((row) => ({
          date: formatDateLabel(row.last_updated),
          happiness: Number(row.happiness_meter) || 0,
          alertness: Number(row.alertness) || 0,
          healthiness: Number(row.healthiness) || 0,
        })),
    [history.moods],
  );

  const weightChange = useMemo(() => {
    if (weightSeries.length < 2) return null;
    const delta = weightSeries[weightSeries.length - 1].value - weightSeries[0].value;
    const sign = delta > 0 ? "+" : "";
    return `${sign}${delta.toFixed(1)} lbs`;
  }, [weightSeries]);

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
      {/*  Weight  */}
      <ChartCard
        title="Weight"
        unit="lbs"
        empty={weightSeries.length === 0}
        emptyText="No weight entries yet."
        latest={weightSeries.length > 0 ? weightSeries[weightSeries.length - 1].value : null}
        latestUnit="lbs"
        accent={accent}
        secondStat={weightChange != null ? { label: "Change", value: weightChange } : null}
      >
        {weightSeries.length > 0 && (
          <>
            <LineChart points={weightSeries} accent={accent} yUnit="lbs" showTooltip />
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-widest text-slate-500">Recent Weight Entries</p>
                <p className="text-[10px] text-slate-600">Uses update/delete telemetry routes</p>
              </div>
              {weightActionError ? (
                <p className="text-xs text-rose-300">{weightActionError}</p>
              ) : null}
              {(history.weights || []).slice(0, 6).map((entry, index) => (
                <div
                  key={entry.id ?? `${entry.last_updated}-${index}`}
                  className="rounded-lg border border-white/6 bg-[#0B1120] px-3 py-2"
                >
                  {editingWeightId === entry.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        value={editingWeightValue}
                        onChange={(event) => setEditingWeightValue(event.target.value)}
                        className="w-28 rounded-md border border-white/10 bg-[#080D19] px-2 py-1 text-sm text-white outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveWeight(entry)}
                        disabled={weightActionLoading}
                        className="rounded-md px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                        style={{ backgroundColor: accent }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingWeightId(null);
                          setEditingWeightValue("");
                          setWeightActionError("");
                        }}
                        className="rounded-md border border-white/10 px-3 py-1 text-xs text-slate-300"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{formatNumber(Number(entry.weight) || 0)} lbs</p>
                        <p className="text-[11px] text-slate-500">{formatDateLabel(entry.last_updated || entry.created_at)}</p>
                      </div>
                      <div className="flex gap-2">
                        {entry.id != null ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingWeightId(entry.id);
                                setEditingWeightValue(String(entry.weight || ""));
                                setWeightActionError("");
                              }}
                              className="rounded-md border border-white/10 px-3 py-1 text-xs text-slate-300"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteWeight(entry.id)}
                              disabled={weightActionLoading}
                              className="rounded-md border border-rose-500/30 px-3 py-1 text-xs text-rose-300 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </ChartCard>

      {/*  Steps  */}
      <ChartCard
        title="Steps"
        unit="steps / day"
        empty={stepsSeries.length === 0}
        emptyText="No step entries yet."
        accent={accent}
        noStats
      >
        {stepsSeries.length > 0 && (
          <StepsChart allPoints={stepsSeries} accent={accent} />
        )}
      </ChartCard>

      {/*  Mood  */}
      <ChartCard
        title="Mood Trends"
        unit="1 – 10"
        empty={moodSeries.length === 0}
        emptyText="No mood entries yet."
        accent={accent}
        noStats
        wide
      >
        {moodSeries.length > 0 && (
          <MoodLineChart allPoints={moodSeries} accent={accent} />
        )}
      </ChartCard>

      {/*  Workouts  */}
      <ChartCard
        title="Completed Workouts"
        unit="per day"
        empty={workoutsByDay.length === 0}
        emptyText="No completed workouts yet."
        accent={accent}
        noStats
      >
        {workoutsByDay.length > 0 && (
          <BarChart
            points={workoutsByDay.map((d) => ({ value: d.value, date: d.day }))}
            accent={accent}
          />
        )}
      </ChartCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Chart shell
   ═══════════════════════════════════════════════════════════════════════ */

function ChartCard({
  title, unit, empty, emptyText, children, wide = false, accent,
  noStats = false, latest = null, latestUnit = "", secondStat,
}) {
  return (
    <div className={`rounded-xl border border-white/6 bg-[#101827] p-4 ${wide ? "md:col-span-2" : ""}`}>
      <div className="flex items-end justify-between gap-3 mb-3">
        <div>
          <p className="text-xs font-semibold text-white">{title}</p>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-0.5">{unit}</p>
        </div>
        {!empty && !noStats && (
          <div className="flex gap-3 text-right">
            {latest != null && (
              <div>
                <p className="text-[10px] text-slate-500">Latest</p>
                <p className="text-sm font-bold" style={{ color: accent }}>
                  {formatNumber(latest)}{latestUnit ? ` ${latestUnit}` : ""}
                </p>
              </div>
            )}
            {secondStat && (
              <div>
                <p className="text-[10px] text-slate-500">{secondStat.label}</p>
                <p className="text-sm font-bold text-slate-300">{secondStat.value}</p>
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
   Steps chart — bar chart, paginated by week, with Y/X axes + tooltip
   ═══════════════════════════════════════════════════════════════════════ */

function StepsChart({ allPoints, accent }) {
  const [page, setPage] = useState(0); // 0 = most recent WEEK
  const totalPages = Math.ceil(allPoints.length / WEEK);

  // page 0 → newest records; slice from the end going backward
  const pagePoints = useMemo(() => {
    const reversed = [...allPoints].reverse(); // newest first
    return reversed.slice(page * WEEK, (page + 1) * WEEK).reverse(); // back to oldest-first
  }, [allPoints, page]);

  // Reset to page 0 when data changes
  useEffect(() => { setPage(0); }, [allPoints]);

  const [hovered, setHovered] = useState(null); // { barX, barY, value, date }
  const handleLeave = useCallback(() => setHovered(null), []);

  // Layout constants (viewBox units)
  const W = 480, H = 170;
  const Y_W = 38, X_H = 22, PAD_TOP = 10, PAD_R = 8;
  const CW = W - Y_W - PAD_R;   // chart inner width
  const CH = H - X_H - PAD_TOP; // chart inner height

  // Scale
  const rawMax = Math.max(...pagePoints.map((p) => p.value), 1);
  const yMax = Math.ceil(rawMax * 1.1 / niceStep(rawMax)) * niceStep(rawMax);
  const yMin = 0;
  const yRange = yMax - yMin;
  const yTicks = computeYTicks(yMin, yMax, 4);

  const yFor = (v) => PAD_TOP + CH - ((v - yMin) / yRange) * CH;

  // Bars
  const n = pagePoints.length;
  const barGap = 6;
  const barW = Math.max((CW - barGap * (n + 1)) / n, 4);
  const barX = (i) => Y_W + barGap + i * (barW + barGap);
  const barCx = (i) => barX(i) + barW / 2;

  // Tooltip geometry
  const TIP_W = 94, TIP_H = 36;

  return (
    <div>
      <PaginationRow
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
        onNext={() => setPage((p) => Math.max(0, p - 1))}
      />
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ overflow: "visible" }}>
        {/* Y-axis ticks + gridlines */}
        {yTicks.map((tick) => {
          const y = yFor(tick);
          return (
            <g key={tick}>
              <line x1={Y_W} y1={y} x2={W - PAD_R} y2={y} stroke="#1e293b" strokeWidth="1" />
              <text x={Y_W - 4} y={y + 3.5} textAnchor="end" fill="#64748b" fontSize="8.5">
                {formatShort(tick)}
              </text>
            </g>
          );
        })}

        {/* Bars + X-axis labels */}
        {pagePoints.map((p, i) => {
          const bh = yRange === 0 ? 0 : ((p.value - yMin) / yRange) * CH;
          const by = yFor(p.value);
          const cx = barCx(i);
          return (
            <g key={i}>
              <rect
                x={barX(i)}
                y={by}
                width={barW}
                height={Math.max(bh, 1)}
                rx="2"
                fill={accent}
                opacity={hovered?.i === i ? 1 : 0.75}
                style={{ cursor: "pointer" }}
                onMouseEnter={() =>
                  setHovered({ i, cx, barTop: by, value: p.value, date: p.date })
                }
                onMouseLeave={handleLeave}
              />
              <text x={cx} y={H - 5} textAnchor="middle" fill="#475569" fontSize="7.5">
                {shortDate(p.date)}
              </text>
            </g>
          );
        })}

        {/* Y-axis border line */}
        <line x1={Y_W} y1={PAD_TOP} x2={Y_W} y2={PAD_TOP + CH} stroke="#334155" strokeWidth="1" />

        {/* Tooltip */}
        {hovered && (() => {
          const tx = Math.min(Math.max(hovered.cx - TIP_W / 2, Y_W + 2), W - PAD_R - TIP_W - 2);
          const ty = hovered.barTop - TIP_H - 6 < PAD_TOP
            ? hovered.barTop + 6
            : hovered.barTop - TIP_H - 6;
          return (
            <g>
              <rect x={tx} y={ty} width={TIP_W} height={TIP_H} rx="5"
                fill="#1e293b" stroke={accent} strokeWidth="0.8" opacity="0.97" />
              <text x={tx + TIP_W / 2} y={ty + 14} textAnchor="middle"
                fill="white" fontSize="9" fontWeight="700">
                {formatNumber(hovered.value)} steps
              </text>
              <text x={tx + TIP_W / 2} y={ty + 27} textAnchor="middle"
                fill="#94a3b8" fontSize="8">
                {hovered.date}
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Mood chart — three line series, paginated by week, Y/X axes + tooltip
   ═══════════════════════════════════════════════════════════════════════ */

const MOOD_SERIES = [
  { key: "happiness", color: "#3B82F6", label: "Happiness" },
  { key: "alertness", color: "#10B981", label: "Alertness" },
  { key: "healthiness", color: "#F59E0B", label: "Healthiness" },
];

function MoodLineChart({ allPoints, accent }) {
  void accent; // uses per-series colors
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(allPoints.length / WEEK);

  const pagePoints = useMemo(() => {
    const reversed = [...allPoints].reverse();
    return reversed.slice(page * WEEK, (page + 1) * WEEK).reverse();
  }, [allPoints, page]);

  useEffect(() => { setPage(0); }, [allPoints]);

  const [hovered, setHovered] = useState(null); // { i, cx, cy, point }
  const handleLeave = useCallback(() => setHovered(null), []);

  // Layout
  const W = 720, H = 190;
  const Y_W = 26, X_H = 22, PAD_TOP = 10, PAD_R = 8;
  const CW = W - Y_W - PAD_R;
  const CH = H - X_H - PAD_TOP;

  // Fixed 1-10 scale
  const Y_MIN = 1, Y_MAX = 10;
  const yTicks = [1, 3, 5, 7, 10];
  const yFor = (v) => PAD_TOP + CH - ((v - Y_MIN) / (Y_MAX - Y_MIN)) * CH;
  const xFor = (i) =>
    pagePoints.length === 1
      ? Y_W + CW / 2
      : Y_W + (i / (pagePoints.length - 1)) * CW;

  // Tooltip
  const TIP_W = 110, TIP_H = 58;

  return (
    <div>
      <PaginationRow
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
        onNext={() => setPage((p) => Math.max(0, p - 1))}
      />
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-44" style={{ overflow: "visible" }}>
        {/* Y-axis ticks + gridlines */}
        {yTicks.map((tick) => {
          const y = yFor(tick);
          return (
            <g key={tick}>
              <line x1={Y_W} y1={y} x2={W - PAD_R} y2={y} stroke="#1e293b" strokeWidth="1" />
              <text x={Y_W - 4} y={y + 3.5} textAnchor="end" fill="#64748b" fontSize="8.5">
                {tick}
              </text>
            </g>
          );
        })}

        {/* Series lines + dots */}
        {MOOD_SERIES.map((s) => {
          if (pagePoints.length === 0) return null;
          const pts = pagePoints.map((p, i) => `${xFor(i)},${yFor(p[s.key])}`).join(" ");
          return (
            <g key={s.key}>
              <polyline points={pts} fill="none" stroke={s.color}
                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              {pagePoints.map((p, i) => (
                <circle
                  key={i}
                  cx={xFor(i)}
                  cy={yFor(p[s.key])}
                  r="3"
                  fill={s.color}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() =>
                    setHovered({ i, cx: xFor(i), cy: yFor(p[s.key]), point: pagePoints[i] })
                  }
                  onMouseLeave={handleLeave}
                />
              ))}
            </g>
          );
        })}

        {/* X-axis date labels */}
        {pagePoints.map((p, i) => (
          <text key={i} x={xFor(i)} y={H - 5} textAnchor="middle" fill="#475569" fontSize="7.5">
            {shortDate(p.date)}
          </text>
        ))}

        {/* Y-axis border */}
        <line x1={Y_W} y1={PAD_TOP} x2={Y_W} y2={PAD_TOP + CH} stroke="#334155" strokeWidth="1" />

        {/* Tooltip */}
        {hovered && (() => {
          const tx = Math.min(Math.max(hovered.cx - TIP_W / 2, Y_W + 2), W - PAD_R - TIP_W - 2);
          const ty = hovered.cy - TIP_H - 8 < PAD_TOP
            ? hovered.cy + 10
            : hovered.cy - TIP_H - 8;
          const p = hovered.point;
          return (
            <g>
              <rect x={tx} y={ty} width={TIP_W} height={TIP_H} rx="5"
                fill="#1e293b" stroke="#334155" strokeWidth="0.8" opacity="0.98" />
              <text x={tx + TIP_W / 2} y={ty + 13} textAnchor="middle"
                fill="#94a3b8" fontSize="8">
                {p.date}
              </text>
              {MOOD_SERIES.map((s, si) => (
                <g key={s.key}>
                  <circle cx={tx + 10} cy={ty + 22 + si * 12} r="3" fill={s.color} />
                  <text x={tx + 16} y={ty + 26 + si * 12} fill="#cbd5e1" fontSize="8">
                    {s.label}: {p[s.key]}
                  </text>
                </g>
              ))}
            </g>
          );
        })()}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-2">
        {MOOD_SERIES.map((s) => (
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
   Weight line chart (existing, with tooltip)
   ═══════════════════════════════════════════════════════════════════════ */

function LineChart({ points, accent, yUnit = "", width = 480, height = 140, showTooltip = false }) {
  const [hovered, setHovered] = useState(null);
  const handleLeave = useCallback(() => setHovered(null), []);

  const Y_W = 38, PAD_TOP = 10, PAD_R = 8, X_H = 0;
  const CW = width - Y_W - PAD_R;
  const CH = height - PAD_TOP - X_H - 8;

  const values = points.map((p) => p.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const padding = (rawMax - rawMin) * 0.1 || 1;
  const yMin = rawMin - padding;
  const yMax = rawMax + padding;
  const yRange = yMax - yMin || 1;
  const yTicks = computeYTicks(rawMin, rawMax, 4);

  const yFor = (v) => PAD_TOP + CH - ((v - yMin) / yRange) * CH;
  const xFor = (i) =>
    points.length === 1
      ? Y_W + CW / 2
      : Y_W + (i / (points.length - 1)) * CW;

  const polyline = points.map((_, i) => `${xFor(i)},${yFor(points[i].value)}`).join(" ");
  const areaPolygon = `${Y_W},${PAD_TOP + CH} ${polyline} ${xFor(points.length - 1)},${PAD_TOP + CH}`;
  const gradId = `lg-${accent.replace("#", "")}`;

  const TIP_W = 90, TIP_H = 34;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.3" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Y gridlines + labels */}
      {yTicks.map((tick) => {
        const y = yFor(tick);
        return (
          <g key={tick}>
            <line x1={Y_W} y1={y} x2={width - PAD_R} y2={y} stroke="#1e293b" strokeWidth="1" />
            <text x={Y_W - 4} y={y + 3.5} textAnchor="end" fill="#64748b" fontSize="8.5">
              {formatNumber(tick)}
            </text>
          </g>
        );
      })}

      <line x1={Y_W} y1={PAD_TOP} x2={Y_W} y2={PAD_TOP + CH} stroke="#334155" strokeWidth="1" />

      <polygon points={areaPolygon} fill={`url(#${gradId})`} />
      <polyline points={polyline} fill="none" stroke={accent}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {points.map((p, i) => (
        <circle
          key={i}
          cx={xFor(i)}
          cy={yFor(p.value)}
          r={showTooltip ? 4 : 2.5}
          fill={accent}
          style={{ cursor: showTooltip ? "pointer" : "default" }}
          onMouseEnter={() =>
            showTooltip && setHovered({ cx: xFor(i), cy: yFor(p.value), value: p.value, date: p.date })
          }
          onMouseLeave={handleLeave}
        />
      ))}

      {hovered && (() => {
        const tx = Math.min(Math.max(hovered.cx - TIP_W / 2, Y_W + 2), width - PAD_R - TIP_W - 2);
        const ty = hovered.cy - TIP_H - 8 < PAD_TOP
          ? hovered.cy + 10
          : hovered.cy - TIP_H - 8;
        return (
          <g>
            <rect x={tx} y={ty} width={TIP_W} height={TIP_H} rx="5"
              fill="#1e293b" stroke={accent} strokeWidth="0.8" opacity="0.97" />
            <text x={tx + TIP_W / 2} y={ty + 13} textAnchor="middle"
              fill="white" fontSize="9" fontWeight="700">
              {formatNumber(hovered.value)}{yUnit ? ` ${yUnit}` : ""}
            </text>
            <text x={tx + TIP_W / 2} y={ty + 26} textAnchor="middle"
              fill="#94a3b8" fontSize="8">
              {hovered.date || ""}
            </text>
          </g>
        );
      })()}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Simple bar chart (workouts)
   ═══════════════════════════════════════════════════════════════════════ */

function BarChart({ points, accent, width = 480, height = 130 }) {
  if (!points || points.length === 0) return null;

  const Y_W = 24, PAD_TOP = 8, PAD_R = 8, X_H = 0;
  const CW = width - Y_W - PAD_R;
  const CH = height - PAD_TOP - X_H - 8;

  const rawMax = Math.max(...points.map((p) => p.value), 1);
  const yTicks = computeYTicks(0, rawMax, 3);
  const yFor = (v) => PAD_TOP + CH - (v / rawMax) * CH;

  const n = points.length;
  const barGap = 4;
  const barW = Math.max((CW - barGap * (n + 1)) / n, 3);
  const barX = (i) => Y_W + barGap + i * (barW + barGap);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-28">
      {yTicks.map((tick) => {
        const y = yFor(tick);
        return (
          <g key={tick}>
            <line x1={Y_W} y1={y} x2={width - PAD_R} y2={y} stroke="#1e293b" strokeWidth="1" />
            <text x={Y_W - 4} y={y + 3.5} textAnchor="end" fill="#64748b" fontSize="8">
              {tick}
            </text>
          </g>
        );
      })}
      <line x1={Y_W} y1={PAD_TOP} x2={Y_W} y2={PAD_TOP + CH} stroke="#334155" strokeWidth="1" />
      {points.map((p, i) => {
        const bh = (p.value / rawMax) * CH;
        return (
          <rect key={i} x={barX(i)} y={yFor(p.value)}
            width={barW} height={Math.max(bh, 1)} rx="2"
            fill={accent} opacity={0.8} />
        );
      })}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Shared UI
   ═══════════════════════════════════════════════════════════════════════ */

function PaginationRow({ page, totalPages, onPrev, onNext }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mb-2">
      <button
        onClick={onPrev}
        disabled={page >= totalPages - 1}
        className="rounded-md border border-white/10 px-2 py-0.5 text-[10px] text-slate-400 hover:text-white disabled:opacity-25 transition-colors"
      >
        ← Older
      </button>
      <span className="text-[10px] text-slate-500">
        {page + 1} / {totalPages}
      </span>
      <button
        onClick={onNext}
        disabled={page === 0}
        className="rounded-md border border-white/10 px-2 py-0.5 text-[10px] text-slate-400 hover:text-white disabled:opacity-25 transition-colors"
      >
        Newer →
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════════ */

/** Compute n evenly-spaced tick values between min and max. */
function computeYTicks(min, max, n = 4) {
  if (min === max) return [min];
  const step = (max - min) / (n - 1);
  return Array.from({ length: n }, (_, i) => {
    const v = min + step * i;
    return Math.round(v * 10) / 10;
  });
}

/** A "nice" step size for rounding: nearest power-of-10 or half thereof. */
function niceStep(max) {
  if (max <= 0) return 1;
  const exp = Math.floor(Math.log10(max));
  const base = Math.pow(10, exp);
  return max / base >= 5 ? base : base / 2;
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
  if (value >= 10000) return value.toLocaleString();
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

/** Compact label for large numbers: 8500 → "8.5k", 10000 → "10k". */
function formatShort(value) {
  if (typeof value !== "number") return "";
  if (value >= 1000) {
    const k = value / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return String(Math.round(value));
}

/** "May 5" from a formatted date string. */
function shortDate(dateStr) {
  if (!dateStr) return "";
  // dateStr is already formatted like "May 5, 2026" from formatDateLabel
  const parts = dateStr.split(",")[0]; // "May 5"
  return parts || dateStr.slice(0, 6);
}

function formatDateLabel(value) {
  if (!value) return "";
  try {
    const d = new Date(String(value).slice(0, 10) + "T00:00:00");
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}
