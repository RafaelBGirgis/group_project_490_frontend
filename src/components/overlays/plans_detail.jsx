import StatusBadge from "../status_badge";

/**
 * Pricing plans detail overlay for admin.
 *
 * Props:
 *   plans – [{ id, coach_name, payment_interval, payment_amount, open_to_entry }]
 */
export default function PlansDetail({ plans }) {
  const openPlans = plans.filter((p) => p.open_to_entry);
  const closedPlans = plans.filter((p) => !p.open_to_entry);

  return (
    <>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#0A1020] rounded-xl p-3 text-center">
          <p className="text-red-400 font-bold text-xl">{plans.length}</p>
          <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-0.5">Total Plans</p>
        </div>
        <div className="bg-[#0A1020] rounded-xl p-3 text-center">
          <p className="text-green-400 font-bold text-xl">{openPlans.length}</p>
          <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-0.5">Open</p>
        </div>
        <div className="bg-[#0A1020] rounded-xl p-3 text-center">
          <p className="text-gray-400 font-bold text-xl">{closedPlans.length}</p>
          <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-0.5">Closed</p>
        </div>
      </div>

      {/* Plan list */}
      <div className="space-y-2">
        {plans.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">No pricing plans found</p>
        ) : (
          plans.map((plan) => (
            <div
              key={plan.id}
              className="flex items-center justify-between rounded-xl border border-white/5 bg-[rgba(255,255,255,0.02)] px-4 py-3"
            >
              <div>
                <p className="text-white font-semibold text-sm">{plan.coach_name}</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  ${plan.payment_amount} / {plan.payment_interval}
                </p>
              </div>
              <StatusBadge
                label={plan.open_to_entry ? "Open" : "Closed"}
                variant={plan.open_to_entry ? "success" : "neutral"}
                dot
              />
            </div>
          ))
        )}
      </div>
    </>
  );
}
