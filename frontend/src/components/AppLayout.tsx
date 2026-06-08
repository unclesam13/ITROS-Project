import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const nav = [
  { to: "/", label: "Dashboard" },
  { to: "/tasks", label: "Tasks" },
  { to: "/tasks/new", label: "Submit" },
  { to: "/workload", label: "Workload" },
  { to: "/admin/heatmap", label: "Heatmap", roles: ["admin"] },
  { to: "/admin/users", label: "Users", roles: ["admin"] },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-8">
            <Link to={user ? "/" : "/help"} className="text-xl font-bold text-brand-700">
              ITROS
            </Link>
            {user && (
              <nav className="hidden gap-1 sm:flex">
                {nav
                  .filter((n) => !n.roles || n.roles.includes(user.role))
                  .map((n) => (
                    <Link
                      key={n.to}
                      to={n.to}
                      className={`rounded-lg px-3 py-2 text-sm font-medium ${
                        location.pathname === n.to || (n.to !== "/" && location.pathname.startsWith(n.to))
                          ? "bg-brand-50 text-brand-700"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {n.label}
                    </Link>
                  ))}
              </nav>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link
              to="/help"
              className={`rounded-lg px-3 py-1.5 font-medium ${
                location.pathname === "/help"
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Help
            </Link>
            {user ? (
              <>
                <span className="hidden text-slate-600 sm:inline">
                  {user.full_name} <span className="text-slate-400">({user.role})</span>
                </span>
                <button
                  onClick={logout}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
