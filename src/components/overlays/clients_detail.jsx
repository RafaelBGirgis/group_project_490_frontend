import ProfileAvatar from "../profile_avatar";

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
              <ProfileAvatar
                src={c.details?.base_account?.pfp_url}
                alt={c.name}
                name={c.name}
                size="sm"
              />
              <div>
                <p className="text-white font-semibold text-sm">{c.name}</p>
                <p className="text-gray-400 text-xs">
                  {c.details?.base_account?.age || "—"} · {c.details?.base_account?.gender || "—"}
                </p>
              </div>
            </div>
            <button
              onClick={() => onMessage?.(c)}
              className="text-xs text-orange-400 border border-orange-500/30 rounded-full px-3 py-1 hover:bg-orange-500/10 transition-colors"
            >
              Message
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
