import StatusBadge from "../status_badge";

/**
 * Upcoming sessions detail overlay for coach.
 *
 * Props:
 *   sessions – [{ id, client_name, weekday, start_time, type }]
 */
export default function SessionsDetail({ sessions }) {
  // Group by weekday
  const grouped = {};
  sessions.forEach((s) => {
    if (!grouped[s.weekday]) grouped[s.weekday] = [];
    grouped[s.weekday].push(s);
  });

  const dayOrder = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const sortedDays = Object.keys(grouped).sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));

  return (
    <>
      <div className="bg-[#0A1020] rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-white font-bold text-base">This Week</p>
          <p className="text-gray-400 text-xs mt-0.5">
            {sessions.length} session{sessions.length !== 1 ? "s" : ""} scheduled
          </p>
        </div>
        <div className="text-right">
          <p className="text-orange-400 font-bold text-2xl">{sessions.length}</p>
          <p className="text-gray-500 text-[10px] uppercase tracking-widest">Sessions</p>
        </div>
      </div>

      {sortedDays.map((day) => (
        <div key={day} className="space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-widest">{day}</p>
          {grouped[day].map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-xl border border-white/5 bg-[rgba(255,255,255,0.02)] px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-orange-900/40 flex items-center justify-center text-orange-400 font-bold text-xs shrink-0">
                  {s.client_name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{s.client_name}</p>
                  <p className="text-gray-400 text-xs">{s.start_time} · {s.type}</p>
                </div>
              </div>
              <StatusBadge label="Upcoming" variant="warning" />
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
