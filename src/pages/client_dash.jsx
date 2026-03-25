import { useNavigate } from "react-router-dom";
import { Navbar } from "../components/navbar";
import { DashboardCard } from "../components/card_dash";

function ClientDashboard() {
  const navigate = useNavigate();

  return (
    <div>
      <Navbar role="client" onSwitch={() => navigate("/coach")} />

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Row 1: Welcome + Stats */}
        <div className="grid grid-cols-4 gap-4">
          <DashboardCard role="client">
            <p className="text-xs text-slate-500 uppercase tracking-widest">Good Morning</p>
            <h1 className="text-3xl font-bold mt-1">John Doe</h1>
          </DashboardCard>

          <DashboardCard role="client">
            <p className="text-xs text-slate-500 uppercase tracking-widest">Steps Today</p>
            <p className="text-2xl font-bold mt-1">8,241</p>
            <p className="text-xs text-blue-400 mt-1">+ 82% of daily goal</p>
          </DashboardCard>

          <DashboardCard title="Calories" role="client">
            <p className="text-3xl font-bold">1438</p>
            <p className="text-xs text-slate-500">of 2000 kcal</p>
          </DashboardCard>

          <DashboardCard title="Progress" role="client">
            <p className="text-3xl font-bold">56%</p>
            <p className="text-xs text-slate-500">weekly goal</p>
          </DashboardCard>
        </div>

      </div>
    </div>
  );
}

export default ClientDashboard;