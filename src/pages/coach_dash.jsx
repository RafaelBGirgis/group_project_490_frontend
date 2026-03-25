import { useNavigate } from "react-router-dom";
import { Navbar } from "../components/navbar";

function CoachDashboard() {
  const navigate = useNavigate();

  return (
    <div>
      <Navbar
        role="coach"
        onSwitch={() => navigate("/client")}
      />
      <h1>Coach Dashboard</h1>
    </div>
  );
}

export default CoachDashboard;