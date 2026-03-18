export default function EmptyState({ title, description }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-12 text-center shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}
