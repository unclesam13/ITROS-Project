import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("manager@itros.local");
  const [password, setPassword] = useState("itros123");
  const [error, setError] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "4rem auto", fontFamily: "system-ui" }}>
      <h1>ITROS Login</h1>
      <form onSubmit={onSubmit}>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%" }} />
        </label>
        <br />
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>
        <br />
        <button type="submit" style={{ marginTop: 12 }}>
          Sign in
        </button>
      </form>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <p style={{ fontSize: 12, color: "#64748b" }}>Demo: manager@itros.local / itros123</p>
    </div>
  );
}
