import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

export default function TaskSubmitPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [channel, setChannel] = useState("manual");
  const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.departments().then((d) => {
      setDepartments(d);
      if (d[0]) setDepartmentId(d[0].id);
    });
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const task = await api.createTask({
        title,
        description,
        intake_channel: channel,
        department_id: departmentId || undefined,
      });
      navigate(`/tasks/${task.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <div style={{ fontFamily: "system-ui", padding: "1.5rem", maxWidth: 640 }}>
      <h2>Submit task</h2>
      <form onSubmit={onSubmit}>
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required style={{ width: "100%" }} />
        </label>
        <br />
        <label>
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={5}
            style={{ width: "100%" }}
          />
        </label>
        <br />
        <label>
          Intake channel
          <select value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="manual">manual</option>
            <option value="form">form</option>
            <option value="email">email</option>
            <option value="internal">internal</option>
          </select>
        </label>
        <br />
        <label>
          Department
          <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <br />
        <button type="submit" style={{ marginTop: 12 }}>
          Submit &amp; auto-route
        </button>
      </form>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
    </div>
  );
}
