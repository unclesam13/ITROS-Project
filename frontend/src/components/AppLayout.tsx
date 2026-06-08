import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

type NavItem = { to: string; label: string; icon: string; roles?: string[]; exact?: boolean };

const planningNav: NavItem[] = [
  { to: "/", label: "Dashboard", icon: "◫", exact: true },
  { to: "/tasks", label: "Board", icon: "▦" },
  { to: "/tasks/new", label: "Submit", icon: "＋", exact: true },
  { to: "/workload", label: "Workload", icon: "◎", exact: true },
];

const adminNav: NavItem[] = [
  { to: "/admin/heatmap", label: "Heatmap", icon: "▥", roles: ["admin"] },
  { to: "/admin/users", label: "Users", icon: "👤", roles: ["admin"] },
];

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      to={item.to}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-l-2 border-accent bg-accent/10 text-white"
          : "text-slate-400 hover:bg-surface-hover hover:text-slate-200"
      }`}
    >
      <span className="w-4 text-center text-xs opacity-70">{item.icon}</span>
      {item.label}
    </Link>
  );
}

function isActive(pathname: string, item: NavItem): boolean {
  const { to, exact } = item;
  if (to === "/") return pathname === "/";
  if (to === "/tasks") {
    if (pathname === "/tasks") return true;
    if (pathname.startsWith("/tasks/") && !pathname.startsWith("/tasks/new")) return true;
    return false;
  }
  if (exact) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const initials = user?.full_name
    ?.split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-surface-base">
      <aside className="sticky top-0 hidden h-screen w-52 flex-shrink-0 flex-col border-r border-surface-border bg-surface-sidebar md:flex">
        <div className="border-b border-surface-border px-3 py-3">
          <Link to={user ? "/" : "/help"} className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-xs font-bold text-white">I</span>
            <div>
              <p className="text-sm font-bold text-white">ITROS</p>
              <p className="text-[10px] text-slate-500">Task routing system</p>
            </div>
          </Link>
        </div>

        {user && (
          <nav className="space-y-5 overflow-y-auto p-3">
            <div>
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-600">Planning</p>
              <div className="space-y-0.5">
                {planningNav.map((item) => (
                  <NavLink key={item.to} item={item} active={isActive(location.pathname, item)} />
                ))}
              </div>
            </div>
            {user.role === "admin" && (
              <div>
                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-600">Admin</p>
                <div className="space-y-0.5">
                  {adminNav
                    .filter((n) => !n.roles || n.roles.includes(user.role))
                    .map((item) => (
                      <NavLink key={item.to} item={item} active={isActive(location.pathname, item)} />
                    ))}
                </div>
              </div>
            )}
            <div>
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-600">Quick actions</p>
              <div className="space-y-0.5">
                <Link
                  to="/tasks/new"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-surface-hover hover:text-slate-200"
                >
                  <span className="w-4 text-center text-xs opacity-70">＋</span>
                  New task
                </Link>
                <Link
                  to="/help"
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-surface-hover hover:text-slate-200 ${
                    location.pathname === "/help" ? "text-accent-bright" : "text-slate-400"
                  }`}
                >
                  <span className="w-4 text-center text-xs opacity-70">?</span>
                  Help &amp; docs
                </Link>
              </div>
            </div>
          </nav>
        )}

        {user && (
          <div className="mt-auto border-t border-surface-border p-3">
            <div className="flex items-center gap-2 rounded-lg px-2 py-2">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent/30 text-xs font-semibold text-accent-bright">
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-200">{user.full_name}</p>
                <p className="truncate text-[10px] capitalize text-slate-500">{user.role}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-11 flex-shrink-0 items-center justify-between border-b border-surface-border bg-surface-sidebar/95 px-3 backdrop-blur sm:px-4">
          <div className="flex items-center gap-3 md:hidden">
            <Link to={user ? "/" : "/help"} className="text-sm font-bold text-white">ITROS</Link>
          </div>
          <div className="hidden flex-1 md:block">
            <div className="max-w-sm">
              <input
                type="search"
                placeholder="Search tasks..."
                className="input py-1.5"
                readOnly
              />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Link
              to="/help"
              className={`btn-ghost hidden sm:inline-flex ${location.pathname === "/help" ? "bg-accent/15 text-accent-bright" : ""}`}
            >
              Help
            </Link>
            {user ? (
              <>
                <span className="hidden text-slate-400 lg:inline">{user.full_name}</span>
                <button type="button" onClick={logout} className="btn-secondary py-1.5 text-xs sm:text-sm">
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="btn-secondary py-1.5">Sign in</Link>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-3 sm:p-4 lg:p-5">
          <div className="page-container">{children}</div>
        </main>
      </div>
    </div>
  );
}
