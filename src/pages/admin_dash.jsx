import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Navbar,
  StatCard,
  DashboardCard,
  ListRow,
  StatusBadge,
  SectionHeader,
  Overlay,
  SkeletonStatCard,
  SkeletonDashCard,
} from "../components";
import { fetchMe } from "../api/client";
import RoleRequestsDetail from "../components/overlays/role_requests_detail";
import AccountsDetail from "../components/overlays/accounts_detail";
import PlansDetail from "../components/overlays/plans_detail";
import ReportsDetail from "../components/overlays/reports_detail";

const role = "admin";

export default function AdminDash() {
  const navigate = useNavigate();

  /* ── auth guard ──────────────────────────────────────────────────── */
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    const token = localStorage.getItem("jwt");
    if (!token) { navigate("/login"); return; }
    setAuthed(true);
  }, [navigate]);

  /* ── overlay state ──────────────────────────────────────────────── */
  const [overlay, setOverlay] = useState(null); // "requests" | "accounts" | "plans" | "reports"
  const closeOverlay = () => setOverlay(null);

  /* ── user info ──────────────────────────────────────────────────── */
  const [initials, setInitials] = useState("?");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!authed) return;
    fetchMe()
      .then((me) => {
        if (me?.name) setInitials(me.name.split(" ").map((n) => n[0]).join("").toUpperCase());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authed]);

  /* ── stats ──────────────────────────────────────────────────────── */
  const [stats, setStats] = useState(null);
  useEffect(() => {
    // TODO: GET /admin/stats
    setStats({
      total_accounts: 142,
      total_clients: 98,
      total_coaches: 21,
      pending_role_requests: 5,
    });
  }, []);

  /* ── role requests ──────────────────────────────────────────────── */
  const [roleRequests, setRoleRequests] = useState([]);
  useEffect(() => {
    // TODO: GET /admin/role-requests
    setRoleRequests([
      { id: 1, account_name: "Marcus Webb",   requested_role: "Coach",  is_approved: null },
      { id: 2, account_name: "Priya Sharma",  requested_role: "Coach",  is_approved: null },
      { id: 3, account_name: "Jordan Lee",    requested_role: "Client", is_approved: null },
      { id: 4, account_name: "Tanya Okonkwo", requested_role: "Coach",  is_approved: null },
      { id: 5, account_name: "Sam Rivera",    requested_role: "Client", is_approved: null },
    ]);
  }, []);

  /* ── recent accounts ────────────────────────────────────────────── */
  const [recentAccounts, setRecentAccounts] = useState([]);
  useEffect(() => {
    // TODO: GET /admin/accounts?limit=5&sort=created_at:desc
    setRecentAccounts([
      { id: 1, name: "Elena Marks",    email: "elena@mail.com",  role: "client", created_at: "2 mins ago"  },
      { id: 2, name: "David Osei",     email: "david@mail.com",  role: "coach",  created_at: "1 hr ago"   },
      { id: 3, name: "Aisha Patel",    email: "aisha@mail.com",  role: "client", created_at: "3 hrs ago"  },
      { id: 4, name: "Chris Nguyen",   email: "chris@mail.com",  role: "client", created_at: "5 hrs ago"  },
      { id: 5, name: "Fatima Al-Amin", email: "fatima@mail.com", role: "coach",  created_at: "Yesterday"  },
    ]);
  }, []);

  /* ── pricing plans ──────────────────────────────────────────────── */
  const [pricingPlans, setPricingPlans] = useState([]);
  useEffect(() => {
    // TODO: GET /admin/pricing-plans
    setPricingPlans([
      { id: 1, coach_name: "Rafael Girgis", payment_interval: "monthly", payment_amount: 149.99, open_to_entry: true  },
      { id: 2, coach_name: "Sandra Kim",    payment_interval: "weekly",  payment_amount: 49.99,  open_to_entry: true  },
      { id: 3, coach_name: "David Osei",    payment_interval: "monthly", payment_amount: 199.99, open_to_entry: false },
    ]);
  }, []);

  /* ── reports ────────────────────────────────────────────────────── */
  const [reports, setReports] = useState([]);
  useEffect(() => {
    // TODO: GET /admin/reports
    setReports([
      { id: 1, reporter_name: "Aisha Patel",  reported_name: "Coach X", reason: "Inappropriate content", created_at: "1 hr ago"  },
      { id: 2, reporter_name: "Chris Nguyen", reported_name: "Coach Y", reason: "No show",               created_at: "3 hrs ago" },
    ]);
  }, []);

  /* ── actions ────────────────────────────────────────────────────── */
  const handleApprove = (id) => {
    setRoleRequests((prev) => prev.map((r) => (r.id === id ? { ...r, is_approved: true } : r)));
  };
  const handleReject = (id) => {
    setRoleRequests((prev) => prev.map((r) => (r.id === id ? { ...r, is_approved: false } : r)));
  };
  const handleDismissReport = (id) => {
    setReports((prev) => prev.filter((r) => r.id !== id));
  };

  const pendingRequests = roleRequests.filter((r) => r.is_approved === null);

  /* ── loading skeleton ────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#080D19" }}>
        <Navbar role={role} userName="?" />
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
          <div className="h-5 w-40 bg-white/5 rounded animate-pulse" />
          <div className="grid grid-cols-4 gap-4">
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </div>
          <div className="h-5 w-40 bg-white/5 rounded animate-pulse" />
          <div className="grid grid-cols-2 gap-4">
            <SkeletonDashCard rows={3} />
            <SkeletonDashCard rows={3} />
          </div>
          <div className="h-5 w-40 bg-white/5 rounded animate-pulse" />
          <div className="grid grid-cols-2 gap-4">
            <SkeletonDashCard rows={4} />
            <SkeletonDashCard rows={3} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#080D19" }}>
      <Navbar role={role} userName={initials} />

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* ─── OVERVIEW ───────────────────────────────────────────── */}
        <SectionHeader label="OVERVIEW" role={role} />

        <div className="grid grid-cols-4 gap-4">
          <StatCard role={role} label="TOTAL ACCOUNTS" value={stats?.total_accounts ?? "—"} sub="all registered users" />
          <StatCard role={role} label="ACTIVE CLIENTS" value={stats?.total_clients ?? "—"} sub="across all coaches" />
          <StatCard role={role} label="ACTIVE COACHES" value={stats?.total_coaches ?? "—"} sub="on the platform" />
          <StatCard role={role} label="PENDING REQUESTS" value={stats?.pending_role_requests ?? "—"} sub="awaiting approval" />
        </div>

        {/* ─── ROLE REQUESTS ──────────────────────────────────────── */}
        <SectionHeader label="ROLE REQUESTS" role={role} />

        <div className="grid grid-cols-2 gap-4">
          <DashboardCard
            role={role}
            title={`Pending Approvals (${pendingRequests.length})`}
            action={{
              label: "View all",
              onClick: () => setOverlay("requests"),
            }}
          >
            {pendingRequests.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No pending requests</p>
            ) : (
              <div className="space-y-2">
                {pendingRequests.slice(0, 3).map((req) => (
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
                {pendingRequests.length > 3 && (
                  <p className="text-gray-500 text-xs text-center pt-1">
                    +{pendingRequests.length - 3} more pending
                  </p>
                )}
              </div>
            )}
          </DashboardCard>

          <DashboardCard role={role} title="Recently Resolved">
            {roleRequests.filter((r) => r.is_approved !== null).length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No resolved requests yet</p>
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

        {/* ─── ACCOUNTS & PLANS ───────────────────────────────────── */}
        <SectionHeader label="ACCOUNTS & PLANS" role={role} />

        <div className="grid grid-cols-2 gap-4">
          <DashboardCard
            role={role}
            title="Recent Registrations"
            action={{
              label: "View all",
              onClick: () => setOverlay("accounts"),
            }}
          >
            <div className="space-y-2">
              {recentAccounts.slice(0, 4).map((acc) => (
                <ListRow
                  key={acc.id}
                  label={acc.name}
                  sub={acc.email}
                  right={
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        label={acc.role}
                        variant={acc.role === "coach" ? "warning" : acc.role === "admin" ? "danger" : "info"}
                      />
                      <span className="text-gray-600 text-[10px]">{acc.created_at}</span>
                    </div>
                  }
                />
              ))}
            </div>
          </DashboardCard>

          <DashboardCard
            role={role}
            title="Coach Pricing Plans"
            action={{
              label: "View all",
              onClick: () => setOverlay("plans"),
            }}
          >
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

        {/* ─── REPORTS & FLAGS ────────────────────────────────────── */}
        <SectionHeader label="REPORTS & FLAGS" role={role} />

        <DashboardCard
          role={role}
          title="Active Reports"
          action={{
            label: "View all",
            onClick: () => setOverlay("reports"),
          }}
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

      {/* ═══════════════════════════════════════════════════════════════
          OVERLAYS
          ═══════════════════════════════════════════════════════════════ */}

      <Overlay
        open={overlay === "requests"}
        onClose={closeOverlay}
        title="Role Promotion Requests"
        wide
      >
        <RoleRequestsDetail
          requests={roleRequests}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </Overlay>

      <Overlay
        open={overlay === "accounts"}
        onClose={closeOverlay}
        title="All Accounts"
        wide
      >
        <AccountsDetail accounts={recentAccounts} />
      </Overlay>

      <Overlay
        open={overlay === "plans"}
        onClose={closeOverlay}
        title="Coach Pricing Plans"
      >
        <PlansDetail plans={pricingPlans} />
      </Overlay>

      <Overlay
        open={overlay === "reports"}
        onClose={closeOverlay}
        title="Reports & Flags"
        wide
      >
        <ReportsDetail
          reports={reports}
          onDismiss={handleDismissReport}
          onEscalate={(id) => {
            // TODO: POST /admin/reports/:id/escalate
          }}
        />
      </Overlay>
    </div>
  );
}
