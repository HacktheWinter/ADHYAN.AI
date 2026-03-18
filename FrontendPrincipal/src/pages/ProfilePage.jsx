import { getStoredUser } from "../utils/authStorage";
import PageHeader from "../components/common/PageHeader";
import SectionCard from "../components/common/SectionCard";

export default function ProfilePage() {
  const user = getStoredUser();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Principal profile"
        title={user?.name || "Principal"}
        description="Read-only identity context for the currently signed-in inspection account."
      />

      <SectionCard title="Account details">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 px-4 py-4">
            <p className="text-sm text-slate-500">Name</p>
            <p className="mt-2 font-semibold text-slate-900">{user?.name || "-"}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-4">
            <p className="text-sm text-slate-500">Email</p>
            <p className="mt-2 font-semibold text-slate-900">{user?.email || "-"}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-4">
            <p className="text-sm text-slate-500">Role</p>
            <p className="mt-2 font-semibold text-slate-900">{user?.role || "-"}</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
