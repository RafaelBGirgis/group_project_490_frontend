import StatusBadge from "../status_badge";

/**
 * Coach's client list detail overlay.
 *
 * Props:
 *   clients – [{ id, name, goal, status, joined }]
 *   onMessage – (clientId) => void
 */
export default function ClientsDetail({ clients, onMessage }) {
  const active = clients.filter((c) => c.status === "active");
  const paused = clients.filter((c) => c.status !== "active");

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#0A1020] rounded-xl p-3 text-center">
          <p className="text-orange-400 font-bold text-xl">{clients.length}</p>
          <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-0.5">Total</p>
        </div>
        <div className="bg-[#0A1020] rounded-xl p-3 text-center">
          <p className="text-green-400 font-bold text-xl">{active.length}</p>
          <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-0.5">Active</p>
        </div>
        <div className="bg-[#0A1020] rounded-xl p-3 text-center">
          <p className="text-gray-400 font-bold text-xl">{paused.length}</p>
          <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-0.5">Paused</p>
        </div>
      </div>

      <div className="space-y-2">
        {clients.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between rounded-xl border border-white/5 bg-[rgba(255,255,255,0.02)] px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-orange-900/40 flex items-center justify-center text-orange-400 font-bold text-xs shrink-0">
                {c.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{c.name}</p>
                <p className="text-gray-400 text-xs">{c.goal} · Joined {c.joined}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge
                label={c.status}
                variant={c.status === "active" ? "success" : "neutral"}
                dot
              />
              <button
                onClick={() => onMessage?.(c.id)}
                className="text-xs text-orange-400 border border-orange-500/30 rounded-full px-3 py-1 hover:bg-orange-500/10 transition-colors"
              >
                Message
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
