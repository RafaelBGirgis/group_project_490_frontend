import StatusBadge from "../status_badge";

/**
 * Reports detail overlay for admin — shows flagged reports with actions.
 *
 * Props:
 *   reports    – [{ id, reporter_name, reported_name, reason, created_at }]
 *   onDismiss  – (id) => void
 *   onEscalate – (id) => void
 */
export default function ReportsDetail({ reports, onDismiss, onEscalate }) {
  return (
    <>
      {/* Summary */}
      <div className="bg-[#0A1020] rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-white font-bold text-base">Active Reports</p>
          <p className="text-gray-400 text-xs mt-0.5">
            {reports.length} report{reports.length !== 1 ? "s" : ""} requiring attention
          </p>
        </div>
        <div className="text-right">
          <p className="text-red-400 font-bold text-2xl">{reports.length}</p>
          <p className="text-gray-500 text-[10px] uppercase tracking-widest">Flagged</p>
        </div>
      </div>

      {/* Report list */}
      {reports.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">No active reports</p>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div
              key={report.id}
              className="rounded-xl border border-white/5 bg-[rgba(255,255,255,0.02)] p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white font-semibold text-sm">
                    {report.reporter_name}{" "}
                    <span className="text-gray-500 font-normal">reported</span>{" "}
                    {report.reported_name}
                  </p>
                  <p className="text-gray-400 text-xs mt-1">{report.reason}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <StatusBadge label="Flagged" variant="danger" dot />
                  <span className="text-gray-600 text-[10px]">{report.created_at}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => onDismiss?.(report.id)}
                  className="flex-1 text-xs border border-gray-700 text-gray-300 hover:bg-gray-800 rounded-lg py-2 transition-colors"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => onEscalate?.(report.id)}
                  className="flex-1 text-xs bg-red-900/40 text-red-400 border border-red-500/30 hover:bg-red-900/60 rounded-lg py-2 transition-colors"
                >
                  Take Action
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
