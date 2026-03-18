import { BellDot, Search } from "lucide-react";
import { getStoredUser } from "../../utils/authStorage";

export default function Topbar() {
  const user = getStoredUser();

  return (
    <div className="flex flex-col gap-4 rounded-[28px] border border-white/80 bg-white/92 px-5 py-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)] lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
          Oversight desk
        </p>
        <h1 className="mt-1 text-xl font-bold text-slate-950">
          Welcome, {user?.name || "Principal"}
        </h1>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          <Search className="h-4 w-4" />
          Read-only inspection workspace
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-700">
          <BellDot className="h-4 w-4" />
          Monitoring institutional activity
        </div>
      </div>
    </div>
  );
}
