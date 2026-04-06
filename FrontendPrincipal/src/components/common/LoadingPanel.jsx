export default function LoadingPanel({ label = "Loading inspection data..." }) {
  return (
    <div className="rounded-[28px] border border-gray-200 bg-white/95 px-6 py-16 text-center shadow-[0_18px_50px_rgba(88,28,135,0.08)]">
      <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-purple-100 border-t-purple-600" />
      <p className="mt-4 text-sm font-medium text-gray-500">{label}</p>
    </div>
  );
}
