import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export default function App() {
  const [health, setHealth] = useState<string>("checking…");

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((r) => r.json())
      .then((d) => setHealth(JSON.stringify(d)))
      .catch(() => setHealth("API unreachable"));
  }, []);

  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: 640 }}>
      <h1>ITROS</h1>
      <p>Intelligent Task Routing and Workload Optimization System</p>
      <p>
        <strong>Phase 0</strong> — scaffold running. API health: <code>{health}</code>
      </p>
    </main>
  );
}
