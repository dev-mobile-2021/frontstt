// API rétrocompatible : accepte l'ancienne (subtitle/action) ET la nouvelle GMAO
// (description/actions/eyebrow/total/totalFiltre).
export default function PageHeader({
  title,
  subtitle,
  description,
  action,
  actions,
  eyebrow,
  total,
  totalFiltre,
}) {
  const desc = description ?? subtitle;
  const act = actions ?? action;
  const filtre = total !== undefined && totalFiltre !== undefined && totalFiltre !== total;

  const fmt = n => new Intl.NumberFormat("fr-FR").format(n);

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 pb-5">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-500">{eyebrow}</div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[26px] font-semibold leading-tight text-ink-900">{title}</h1>
          {total !== undefined && (
            <span
              className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[12px] font-medium tabular-nums text-green-700"
              title={filtre ? `${fmt(totalFiltre)} affiché(s) sur ${fmt(total)} au total` : `${fmt(total)} au total`}
            >
              {filtre ? `${fmt(totalFiltre)} / ${fmt(total)}` : fmt(total)}
            </span>
          )}
        </div>
        {desc && <p className="mt-1 text-[13px] text-ink-500">{desc}</p>}
      </div>
      {act && <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">{act}</div>}
    </div>
  );
}
