export default function SectionCard({ title, description, action = null, children }) {
  return (
    <section className="rounded-[28px] border border-gray-200 bg-white/95 p-6 shadow-[0_18px_50px_rgba(88,28,135,0.08)] backdrop-blur-md">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
