import { useState, useEffect } from "react";
import {
  Navbar,
  StatCard,
  DashboardCard,
  ListRow,
  StatusBadge,
  SectionHeader,
} from "../components";

const role = "admin";

export default function AdminDash() {


  const [stats, setStats] = useState(null);
  useEffect(() => {
    // TODO: GET /admin/stats
    // Returns: { total_accounts, total_clients, total_coaches, pending_role_requests }
    // setStats(data)
    setStats({
      total_accounts: 142,
      total_clients: 98,
      total_coaches: 21,
      pending_role_requests: 5,
    });
  }, []);


  const [roleRequests, setRoleRequests] = useState([]);
  useEffect(() => {
    // TODO: GET /admin/role-requests
    // Returns: [{ id, account_id, account_name, requested_role, is_approved }]
    // setRoleRequests(data)
    setRoleRequests([
      { id: 1, account_name: "Marcus Webb",    requested_role: "Coach",  is_approved: null },
      { id: 2, account_name: "Priya Sharma",   requested_role: "Coach",  is_approved: null },
      { id: 3, account_name: "Jordan Lee",     requested_role: "Client", is_approved: null },
      { id: 4, account_name: "Tanya Okonkwo",  requested_role: "Coach",  is_approved: null },
      { id: 5, account_name: "Sam Rivera",     requested_role: "Client", is_approved: null },
    ]);
  }, []);

 
  const [recentAccounts, setRecentAccounts] = useState([]);
  useEffect(() => {
    // TODO: GET /admin/accounts?limit=5&sort=created_at:desc
    // Returns: [{ id, first_name, last_name, email, role, created_at }]
    // setRecentAccounts(data)
    setRecentAccounts([
      { id: 1, name: "Elena Marks",    email: "elena@mail.com",  role: "client", created_at: "2 mins ago"  },
      { id: 2, name: "David Osei",     email: "david@mail.com",  role: "coach",  created_at: "1 hr ago"   },
      { id: 3, name: "Aisha Patel",    email: "aisha@mail.com",  role: "client", created_at: "3 hrs ago"  },
      { id: 4, name: "Chris Nguyen",   email: "chris@mail.com",  role: "client", created_at: "5 hrs ago"  },
      { id: 5, name: "Fatima Al-Amin", email: "fatima@mail.com", role: "coach",  created_at: "Yesterday"  },
    ]);
  }, []);


  const [pricingPlans, setPricingPlans] = useState([]);
  useEffect(() => {
    // TODO: GET /admin/pricing-plans?open=true
    // Returns: [{ id, coach_name, payment_interval, payment_amount, open_to_entry }]
    // setPricingPlans(data)
    setPricingPlans([
      { id: 1, coach_name: "Rafael Girgis", payment_interval: "monthly", payment_amount: 149.99, open_to_entry: true  },
      { id: 2, coach_name: "Sandra Kim",    payment_interval: "weekly",  payment_amount: 49.99,  open_to_entry: true  },
      { id: 3, coach_name: "David Osei",    payment_interval: "monthly", payment_amount: 199.99, open_to_entry: false },
    ]);
  }, []);

 
  const [reports, setReports] = useState([]);
  useEffect(() => {
    // TODO: GET /admin/reports
    // Returns: [{ id, reporter_name, reported_name, reason, created_at }]
    // setReports(data)
    setReports([
      { id: 1, reporter_name: "Aisha Patel",  reported_name: "Coach X",    reason: "Inappropriate content", created_at: "1 hr ago"  },
      { id: 2, reporter_name: "Chris Nguyen", reported_name: "Coach Y",    reason: "No show",               created_at: "3 hrs ago" },
    ]);
  }, []);


  const handleApprove = (id) => {
    // TODO: PUT /admin/role-requests/:id  body: { is_approved: true }
    setRoleRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_approved: true } : r))
    );
  };

  const handleReject = (id) => {
    // TODO: PUT /admin/role-requests/:id  body: { is_approved: false }
    setRoleRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_approved: false } : r))
    );
  };

  const pendingRequests = roleRequests.filter((r) => r.is_approved === null);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#080D19" }}>
      <Navbar role={role} />

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        
        <SectionHeader label="OVERVIEW" role={role} />

        <div className="grid grid-cols-4 gap-4">
          {/* account table */}
          <StatCard
            role={role}
            label="TOTAL ACCOUNTS"
            value={stats?.total_accounts ?? "—"}
            sub="all registered users"
          />
          {/* client table */}
          <StatCard
            role={role}
            label="ACTIVE CLIENTS"
            value={stats?.total_clients ?? "—"}
            sub="across all coaches"
          />
          {/* coach table */}
          <StatCard
            role={role}
            label="ACTIVE COACHES"
            value={stats?.total_coaches ?? "—"}
            sub="on the platform"
          />
          {/* role_promotion_resolution where is_approved = null */}
          <StatCard
            role={role}
            label="PENDING REQUESTS"
            value={stats?.pending_role_requests ?? "—"}
            sub="awaiting approval"
          />
        </div>


        <SectionHeader label="ROLE REQUESTS" role={role} />

        <div className="grid grid-cols-2 gap-4">

          {/* role_promotion_resolution — pending */}
          <DashboardCard
            role={role}
            title={`Pending Approvals (${pendingRequests.length})`}
          >
            {pendingRequests.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                No pending requests
              </p>
            ) : (
              <div className="space-y-2">
                {pendingRequests.map((req) => (
                  <ListRow
                    key={req.id}
                    label={req.account_name}
                    sub={`Requesting: ${req.requested_role}`}
                    right={
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(req.id)}
                          className="text-xs bg-green-900/40 text-green-400 border border-green-500/30 rounded-full px-3 py-1 hover:bg-green-900/60 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(req.id)}
                          className="text-xs bg-red-900/40 text-red-400 border border-red-500/30 rounded-full px-3 py-1 hover:bg-red-900/60 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    }
                  />
                ))}
              </div>
            )}
          </DashboardCard>

          {/* role_promotion_resolution — resolved */}
          <DashboardCard role={role} title="Recently Resolved">
            {roleRequests.filter((r) => r.is_approved !== null).length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                No resolved requests yet
              </p>
            ) : (
              <div className="space-y-2">
                {roleRequests
                  .filter((r) => r.is_approved !== null)
                  .map((req) => (
                    <ListRow
                      key={req.id}
                      label={req.account_name}
                      sub={`Requested: ${req.requested_role}`}
                      right={
                        <StatusBadge
                          label={req.is_approved ? "Approved" : "Rejected"}
                          variant={req.is_approved ? "success" : "danger"}
                          dot
                        />
                      }
                    />
                  ))}
              </div>
            )}
          </DashboardCard>

        </div>

        <SectionHeader label="ACCOUNTS & PLANS" role={role} />

        <div className="grid grid-cols-2 gap-4">

          {/* account table — recent registrations */}
          <DashboardCard
            role={role}
            title="Recent Registrations"
            action={{ label: "View all", onClick: () => {
              // TODO: navigate to /admin/accounts
            }}}
          >
            <div className="space-y-2">
              {recentAccounts.map((acc) => (
                <ListRow
                  key={acc.id}
                  label={acc.name}
                  sub={acc.email}
                  right={
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        label={acc.role}
                        variant={
                          acc.role === "coach" ? "warning" :
                          acc.role === "admin" ? "danger" : "info"
                        }
                      />
                      <span className="text-gray-600 text-[10px]">{acc.created_at}</span>
                    </div>
                  }
                />
              ))}
            </div>
          </DashboardCard>

          {/* pricing_plan table */}
          <DashboardCard role={role} title="Coach Pricing Plans">
            <div className="space-y-2">
              {pricingPlans.map((plan) => (
                <ListRow
                  key={plan.id}
                  label={plan.coach_name}
                  sub={`$${plan.payment_amount} / ${plan.payment_interval}`}
                  right={
                    <StatusBadge
                      label={plan.open_to_entry ? "Open" : "Closed"}
                      variant={plan.open_to_entry ? "success" : "neutral"}
                      dot
                    />
                  }
                />
              ))}
            </div>
          </DashboardCard>

        </div>


        <SectionHeader label="REPORTS & FLAGS" role={role} />

        {/* report table */}
        <DashboardCard
          role={role}
          title="Active Reports"
          action={{ label: "View all", onClick: () => {
            // TODO: navigate to /admin/reports
          }}}
        >
          {reports.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No active reports</p>
          ) : (
            <div className="space-y-2">
              {reports.map((report) => (
                <ListRow
                  key={report.id}
                  label={`${report.reporter_name} reported ${report.reported_name}`}
                  sub={report.reason}
                  right={
                    <div className="flex items-center gap-2">
                      <StatusBadge label="Flagged" variant="danger" dot />
                      <span className="text-gray-600 text-[10px]">{report.created_at}</span>
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </DashboardCard>

      </div>
    </div>
  );
}