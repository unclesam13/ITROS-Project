import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  return (
    <div style={{ fontFamily: "system-ui", padding: "1.5rem", maxWidth: 800 }}>
      <header style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>ITROS</h1>
        <div>
          {user?.full_name} ({user?.role}){" "}
          <button onClick={logout}>Logout</button>
        </div>
      </header>
      <nav style={{ display: "flex", gap: 16, marginTop: 16 }}>
        <Link to="/tasks/new">Submit task</Link>
        <Link to="/tasks">My tasks</Link>
        {(user?.role === "manager" || user?.role === "admin") && <Link to="/workload">Team workload</Link>}
      </nav>
      <p style={{ marginTop: 24 }}>
        Intelligent Task Routing and Workload Optimization — submit a task to run automatic NLP
        classification and workload-aware routing.
      </p>
    </div>
  );
}
