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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-brand-700 to-slate-800 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <h1 className="text-2xl font-bold text-slate-900">ITROS</h1>
        <p className="mt-1 text-sm text-slate-500">Intelligent Task Routing & Workload Optimization</p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </div>
          <button type="submit" className="w-full rounded-lg bg-brand-600 py-2.5 font-medium text-white hover:bg-brand-700">
            Sign in
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <p className="mt-6 text-xs text-slate-400">
          Demo: manager@itros.local / itros123 ·{" "}
          <Link to="/help" className="text-brand-600 hover:underline">Help</Link>
        </p>
      </div>
    </div>
  );
}
