import { Navbar } from "../components/navbar";

function AdminDashboard() {
  return (
    <div>
      <Navbar role="admin" />
      <h1 className="text-2xl p-6">Admin Dashboard</h1>
    </div>
  );
}

export default AdminDashboard;