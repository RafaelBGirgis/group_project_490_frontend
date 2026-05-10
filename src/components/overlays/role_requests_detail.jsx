import StatusBadge from "../status_badge";

/**
 * Role requests detail overlay for admin — full view of pending and resolved.
 *
 * Props:
 *   requests  – [{ id, account_name, requested_role, is_approved }]
 *   onApprove – (id) => void
 *   onReject  – (id) => void
 */
export default function RoleRequestsDetail({ requests, onApprove, onReject, onView }) {
  const pending  = requests.filter((r) => r.is_approved === null);
  const approved = requests.filter((r) => r.is_approved === true);
  const rejected = requests.filter((r) => r.is_approved === false);

  return (
    <>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#0A1020] rounded-xl p-3 text-center">
          <p className="text-yellow-400 font-bold text-xl">{pending.length}</p>
          <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-0.5">Pending</p>
        </div>
        <div className="bg-[#0A1020] rounded-xl p-3 text-center">
          <p className="text-green-400 font-bold text-xl">{approved.length}</p>
          <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-0.5">Approved</p>
        </div>
        <div className="bg-[#0A1020] rounded-xl p-3 text-center">
          <p className="text-red-400 font-bold text-xl">{rejected.length}</p>
          <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-0.5">Rejected</p>
        </div>
      </div>

      {/* Pending requests
          The applicant name + role label is its own clickable target —
          admins should review the full coach profile (certs, experience,
          bio, pricing) before hitting Approve/Reject. The action buttons
          on the right stop event propagation so clicking "Approve" doesn't
          also navigate away to the profile page. */}
      {pending.length > 0 && (
        <>
          <p className="text-xs text-gray-500 uppercase tracking-widest">Pending Approval</p>
          <div className="space-y-2">
            {pending.map((req) => {
              const canView = onView && req.coach_id != null;
              return (
                <div
                  key={req.id}
                  className={`flex items-center justify-between rounded-xl border border-white/5 bg-[rgba(255,255,255,0.02)] px-4 py-3 ${canView ? "transition-colors hover:bg-[rgba(59,130,246,0.06)] hover:border-blue-500/20" : ""}`}
                >
                  <button
                    type="button"
                    onClick={canView ? () => onView(req) : undefined}
                    disabled={!canView}
                    className={`flex-1 text-left ${canView ? "cursor-pointer" : "cursor-default"}`}
                    aria-label={canView ? `View profile of ${req.account_name}` : undefined}
                  >
                    <p className={`text-white font-semibold text-sm ${canView ? "underline-offset-2 hover:underline" : ""}`}>
                      {req.account_name}
                    </p>
                    <p className="text-gray-400 text-xs mt-0.5">
                      Requesting: {req.requested_role}
                      {canView && <span className="text-blue-400 ml-2">— click to view profile</span>}
                    </p>
                  </button>
                  <div className="flex gap-2 ml-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); onApprove(req.id); }}
                      className="text-xs bg-green-900/40 text-green-400 border border-green-500/30 rounded-full px-4 py-1.5 hover:bg-green-900/60 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onReject(req.id); }}
                      className="text-xs bg-red-900/40 text-red-400 border border-red-500/30 rounded-full px-4 py-1.5 hover:bg-red-900/60 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Resolved requests — same row pattern: name area is the click
          target for the profile, the status badge stays on the right.
          Approved coaches now exist as verified rows in /hirable_coaches,
          so the public profile page resolves them through its normal
          (non-admin) branch — but we still pass `?from=admin` so the
          handler can decide either way without losing context. */}
      {(approved.length > 0 || rejected.length > 0) && (
        <>
          <p className="text-xs text-gray-500 uppercase tracking-widest">Resolved</p>
          <div className="space-y-2">
            {[...approved, ...rejected].map((req) => {
              const canView = onView && req.coach_id != null;
              return (
                <div
                  key={req.id}
                  className={`flex items-center justify-between rounded-xl border border-white/5 bg-[rgba(255,255,255,0.02)] px-4 py-3 ${canView ? "transition-colors hover:bg-[rgba(59,130,246,0.06)] hover:border-blue-500/20" : ""}`}
                >
                  <button
                    type="button"
                    onClick={canView ? () => onView(req) : undefined}
                    disabled={!canView}
                    className={`flex-1 text-left ${canView ? "cursor-pointer" : "cursor-default"}`}
                    aria-label={canView ? `View profile of ${req.account_name}` : undefined}
                  >
                    <p className={`text-white font-semibold text-sm ${canView ? "underline-offset-2 hover:underline" : ""}`}>
                      {req.account_name}
                    </p>
                    <p className="text-gray-400 text-xs mt-0.5">
                      Requested: {req.requested_role}
                    </p>
                  </button>
                  <div className="flex items-center gap-2 ml-3">
                    <StatusBadge
                      label={req.is_approved ? "Approved" : "Rejected"}
                      variant={req.is_approved ? "success" : "danger"}
                      dot
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
