import {
  Activity,
  Building2,
  LayoutDashboard,
  LogOut,
  UserCircle2,
  Users,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { LANDING_PAGE_URL } from "../../config";

const navItems = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard, end: true },
  { label: "Teachers", to: "/teachers", icon: Users },
  { label: "Classes", to: "/classes", icon: Building2 },
  { label: "Activity", to: "/activity", icon: Activity },
  { label: "Profile", to: "/profile", icon: UserCircle2 },
];

export default function Sidebar({ onLogout }) {
  return (
    <aside className="flex self-start flex-col rounded-[30px] border border-gray-200 bg-white/90 p-5 text-gray-700 shadow-[0_24px_60px_rgba(88,28,135,0.08)] backdrop-blur-md xl:sticky xl:top-4 xl:h-[calc(100vh-2rem)]">
      <a
        href={LANDING_PAGE_URL}
        className="rounded-[24px] border border-purple-100 bg-gradient-to-br from-purple-50 via-white to-purple-50 p-4 transition hover:border-purple-200"
      >
        <div className="flex items-center gap-3">
          <img
            src="/logo02.png"
            alt="ADHYAN.AI Logo"
            className="h-14 w-14 object-contain"
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-500">
              ADHYAN.AI
            </p>
            <h2 className="mt-1 text-2xl font-bold text-gray-900">Principal</h2>
          </div>
        </div>
        <p className="mt-4 text-sm text-gray-600">
          Inspection-first control room for academic oversight.
        </p>
      </a>

      <nav className="mt-8 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-[0_16px_30px_rgba(126,34,206,0.25)]"
                  : "text-gray-600 hover:bg-purple-50 hover:text-purple-700"
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
        className="mt-auto flex items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100"
      >
        <LogOut className="h-4 w-4" />
        Logout
      </button>
    </aside>
  );
}
