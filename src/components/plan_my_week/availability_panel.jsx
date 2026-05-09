import { useEffect, useState } from "react";
import { usePlanMyWeek } from "../../contexts/plan_my_week_context";
import { listMyAvailability, listClientAvailabilityAsCoach } from "../../api/plan_my_week";

function fmtTime(dt) {
  return dt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function fmtDate(dt) {
  return dt.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function AvailabilityPanel() {
  const { state } = usePlanMyWeek();
  const isCoach = state.role === "coach";
  const clientId = state.selectedClientId;

  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");

    const from_dt = new Date();
    const to_dt = new Date(from_dt.getTime() + 35 * 24 * 60 * 60 * 1000); // 5 weeks out

    const req =
      isCoach && clientId != null
        ? listClientAvailabilityAsCoach(clientId, {
            from_dt: from_dt.toISOString(),
            to_dt: to_dt.toISOString(),
          })
        : listMyAvailability({
            from_dt: from_dt.toISOString(),
            to_dt: to_dt.toISOString(),
          });

    req
      .then((rows) => {
        if (!alive) return;
        const all = [];
        for (const row of rows) {
          for (const occ of row.occurrences ?? []) {
            all.push({ start: new Date(occ.start_dt), end: new Date(occ.end_dt) });
          }
        }
        all.sort((a, b) => a.start - b.start);
        setSlots(all);
      })
      .catch((e) => {
        if (alive) setError(e?.message || "Failed to load availability");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [isCoach, clientId]);

  const label =
    isCoach && clientId != null
      ? `${state.selectedClientName || "Client"}'s Availability`
      : "Your Availability";

  return (
    <div className="rounded-xl border border-white/10 bg-[#0F1729] p-4 space-y-3 h-full flex flex-col">
      <h2 className="text-sm uppercase tracking-widest text-gray-500 shrink-0">{label}</h2>

      {loading ? (
        <p className="text-xs text-gray-500 text-center py-4">Loading…</p>
      ) : error ? (
        <p className="text-xs text-red-400">{error}</p>
      ) : slots.length === 0 ? (
        <p className="text-xs text-gray-500 text-center py-4">
          {isCoach && clientId != null
            ? "This client has no upcoming availability."
            : "No upcoming availability. Add windows in your settings."}
        </p>
      ) : (
        <ul className="space-y-2 overflow-y-auto flex-1 pr-1">
          {slots.map((slot, i) => {
            const crossesMidnight = !isSameDay(slot.start, slot.end);
            return (
              <li
                key={i}
                className="rounded-lg border border-white/5 bg-[#0A1020] px-3 py-2 text-xs"
              >
                <p className="text-white font-medium">{fmtDate(slot.start)}</p>
                <p className="text-gray-400 mt-0.5">
                  {fmtTime(slot.start)}
                  {" – "}
                  {crossesMidnight
                    ? `${fmtDate(slot.end)} ${fmtTime(slot.end)}`
                    : fmtTime(slot.end)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
