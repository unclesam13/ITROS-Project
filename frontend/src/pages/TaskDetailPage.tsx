import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, type Task } from "../api/client";

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<Task | null>(null);

  useEffect(() => {
    if (id) api.getTask(id).then(setTask);
  }, [id]);

  if (!task) return <p>Loading…</p>;

  return (
    <div style={{ fontFamily: "system-ui", padding: "1.5rem", maxWidth: 720 }}>
      <h2>{task.title}</h2>
      <p>
        <strong>Status:</strong> {task.status} · <strong>Priority:</strong> {task.priority}
      </p>
      <p>{task.description}</p>
      <p>
        <strong>Assignee:</strong> {task.assigned_to?.full_name ?? "Unassigned"}
      </p>
      {task.classification && (
        <section style={{ background: "#f1f5f9", padding: 12, borderRadius: 8 }}>
          <h3>NLP classification</h3>
          <p>
            Category: {task.classification.category} (confidence {task.classification.confidence.toFixed(2)})
          </p>
          <p>Processing: {task.classification.processing_time_ms} ms</p>
        </section>
      )}
      {task.routing && (
        <section style={{ background: "#eff6ff", padding: 12, borderRadius: 8, marginTop: 12 }}>
          <h3>Routing</h3>
          <p>{task.routing.rationale_summary ?? task.routing.status}</p>
          <p>Score: {task.routing.score?.toFixed(2) ?? "—"} · {task.routing.processing_time_ms} ms</p>
        </section>
      )}
    </div>
  );
}
