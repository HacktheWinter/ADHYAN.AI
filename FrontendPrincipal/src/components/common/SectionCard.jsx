export default function SectionCard({ title, description, action = null, children }) {
  return (
    <section className="rounded-[28px] border border-white/80 bg-white/92 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
