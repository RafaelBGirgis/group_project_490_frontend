import StatusBadge from "../status_badge";

/**
 * Accounts detail overlay for admin — shows all registered accounts.
 *
 * Props:
 *   accounts – [{ id, name, email, role, created_at }]
 */
export default function AccountsDetail({ accounts }) {
  const clients = accounts.filter((a) => a.role === "client");
  const coaches = accounts.filter((a) => a.role === "coach");

  return (
    <>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#0A1020] rounded-xl p-3 text-center">
          <p className="text-red-400 font-bold text-xl">{accounts.length}</p>
          <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-0.5">Total</p>
        </div>
        <div className="bg-[#0A1020] rounded-xl p-3 text-center">
          <p className="text-blue-400 font-bold text-xl">{clients.length}</p>
          <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-0.5">Clients</p>
        </div>
        <div className="bg-[#0A1020] rounded-xl p-3 text-center">
          <p className="text-orange-400 font-bold text-xl">{coaches.length}</p>
          <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-0.5">Coaches</p>
        </div>
      </div>

      {/* Account list */}
      <div className="space-y-2">
        {accounts.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">No accounts found</p>
        ) : (
          accounts.map((acc) => (
            <div
              key={acc.id}
              className="flex items-center justify-between rounded-xl border border-white/5 bg-[rgba(255,255,255,0.02)] px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0"
                  style={{
                    backgroundColor:
                      acc.role === "coach" ? "#F97316" :
                      acc.role === "admin" ? "#EF4444" : "#3B82F6",
                  }}
                >
                  {acc.name?.split(" ").map((n) => n[0]).join("").toUpperCase() ?? "?"}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{acc.name}</p>
                  <p className="text-gray-400 text-xs">{acc.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge
                  label={acc.role}
                  variant={
                    acc.role === "coach" ? "warning" :
                    acc.role === "admin" ? "danger" : "info"
                  }
                />
                <span className="text-gray-600 text-[10px] w-20 text-right">{acc.created_at}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
