export default function PageHeader({ eyebrow, title, description, action = null }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-purple-500">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">{title}</h1>
        {description ? (
          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
