import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
    <div className="flex min-h-screen items-center justify-center bg-surface-base p-4">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-lg font-bold text-white">I</span>
          <div>
            <h1 className="text-xl font-bold text-slate-100">ITROS</h1>
            <p className="text-xs text-slate-500">Intelligent Task Routing & Workload Optimization</p>
          </div>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-400">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="input mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-400">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input mt-1" />
          </div>
          <button type="submit" className="btn-primary w-full py-2.5">
            Sign in
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <p className="mt-6 text-xs text-slate-600">
          Demo: manager@itros.local / itros123 ·{" "}
          <Link to="/help" className="text-accent-bright hover:underline">Help</Link>
        </p>
      </div>
    </div>
  );
}
