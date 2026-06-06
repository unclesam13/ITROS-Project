import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Task } from "../api/client";

export default function TaskListPage() {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    api.listTasks().then((r) => setTasks(r.items));
  }, []);

  return (
    <div style={{ fontFamily: "system-ui", padding: "1.5rem", maxWidth: 900 }}>
      <h2>Tasks</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">Title</th>
            <th align="left">Status</th>
            <th align="left">Priority</th>
            <th align="left">Assignee</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr key={t.id}>
              <td>
                <Link to={`/tasks/${t.id}`}>{t.title}</Link>
              </td>
              <td>{t.status}</td>
              <td>{t.priority}</td>
              <td>{t.assigned_to?.full_name ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
