export default function LoadingPanel({ label = "Loading inspection data..." }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-16 text-center shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
      <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-sky-100 border-t-sky-600" />
      <p className="mt-4 text-sm font-medium text-slate-500">{label}</p>
    </div>
  );
}
