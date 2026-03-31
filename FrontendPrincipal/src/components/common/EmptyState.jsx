export default function EmptyState({ title, description }) {
  return (
    <div className="rounded-[28px] border border-purple-100 bg-purple-50/40 px-6 py-12 text-center shadow-[0_18px_50px_rgba(88,28,135,0.06)]">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-500">{description}</p>
    </div>
  );
}
