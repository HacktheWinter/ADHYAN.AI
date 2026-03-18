import {
  Activity,
  Building2,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  UserCircle2,
  Users,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const navItems = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard, end: true },
  { label: "Teachers", to: "/teachers", icon: Users },
  { label: "Classes", to: "/classes", icon: Building2 },
  { label: "Activity", to: "/activity", icon: Activity },
  { label: "Profile", to: "/profile", icon: UserCircle2 },
];

export default function Sidebar({ onLogout }) {
  return (
    <aside className="flex h-full flex-col rounded-[30px] border border-slate-200 bg-[#0f172a] p-5 text-slate-200 shadow-[0_28px_80px_rgba(15,23,42,0.24)]">
      <div className="rounded-[24px] bg-white/6 p-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-400/16 text-sky-300">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
          ADHYAN.AI
        </p>
        <h2 className="mt-1 text-2xl font-bold text-white">Principal</h2>
        <p className="mt-2 text-sm text-slate-400">
          Inspection-first control room for academic oversight.
        </p>
      </div>

      <nav className="mt-8 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-sky-400 text-slate-950 shadow-[0_16px_28px_rgba(56,189,248,0.25)]"
                  : "text-slate-300 hover:bg-white/8 hover:text-white"
              }`
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        onClick={onLogout}
        className="mt-auto flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
      >
        <LogOut className="h-4 w-4" />
        Logout
      </button>
    </aside>
  );
}
