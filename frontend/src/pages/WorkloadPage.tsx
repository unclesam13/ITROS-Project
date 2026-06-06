import { useEffect, useState } from "react";
import { api, type WorkloadResponse } from "../api/client";

export default function WorkloadPage() {
  const [data, setData] = useState<WorkloadResponse | null>(null);

  useEffect(() => {
    api.workload().then(setData);
  }, []);

  if (!data) return <p>Loading…</p>;

  return (
    <div style={{ fontFamily: "system-ui", padding: "1.5rem", maxWidth: 720 }}>
      <h2>Team workload</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">Employee</th>
            <th align="left">Active tasks</th>
            <th align="left">Effort sum</th>
            <th align="left">Max</th>
          </tr>
        </thead>
        <tbody>
          {data.users.map((u) => (
            <tr key={u.user_id}>
              <td>{u.full_name}</td>
              <td>{u.active_task_count}</td>
              <td>{u.effort_sum}</td>
              <td>{u.max_active_tasks}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
