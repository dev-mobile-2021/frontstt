import { useState, useEffect } from "react";
import SearchSelect from "./SearchSelect";
import { useSousTraitantsPaginated } from "../hooks/useSousTraitants";

/**
 * Sélecteur de sous-traitant d'un contrat.
 * Une fois le chantier choisi, seuls les sous-traitants que Sage X3 rattache à ce chantier sont proposés
 * (option « Afficher tous » pour un sous-traitant pas encore lié dans X3).
 *
 * Props : chantierId, value, onChange(e), className, excludeBlackliste, placeholderOption
 */
export default function SousTraitantSelect({
  chantierId,
  value,
  onChange,
  className,
  excludeBlackliste = true,
  placeholderOption = "— Sélectionner un sous-traitant —",
}) {
  const [showAll, setShowAll] = useState(false);

  // Le filtre se réactive à chaque changement de chantier
  useEffect(() => { setShowAll(false); }, [chantierId]);

  const filtered = !!chantierId && !showAll;
  const { data, isLoading } = useSousTraitantsPaginated({
    count: 500,
    chantier_id: filtered ? chantierId : undefined,
  });

  let list = data?.data ?? [];
  if (excludeBlackliste) list = list.filter((s) => s.statut !== "blackliste");

  // Le sous-traitant déjà sélectionné reste toujours visible (édition d'un contrat existant)
  const { data: all } = useSousTraitantsPaginated({ count: 500 });
  const current = (all?.data ?? []).find((s) => String(s.id) === String(value));
  if (current && !list.some((s) => s.id === current.id)) list = [current, ...list];

  return (
    <div>
      <SearchSelect value={value} onChange={onChange} className={className}>
        <option value="">{placeholderOption}</option>
        {list.map((s) => (
          <option key={s.id} value={s.id}>{s.raison_sociale}{s.code_x3 ? ` (${s.code_x3})` : ""}</option>
        ))}
      </SearchSelect>

      {chantierId ? (
        <p className="text-[11px] text-gray-400 mt-1">
          {isLoading
            ? "Chargement…"
            : filtered
              ? <>
                  {list.length} sous-traitant{list.length > 1 ? "s" : ""} rattaché{list.length > 1 ? "s" : ""} à ce chantier dans Sage X3
                  {" · "}
                  <button type="button" onClick={() => setShowAll(true)} className="text-[#087F3E] hover:underline">Afficher tous</button>
                </>
              : <>
                  Tous les sous-traitants affichés
                  {" · "}
                  <button type="button" onClick={() => setShowAll(false)} className="text-[#087F3E] hover:underline">Seulement ceux du chantier</button>
                </>}
        </p>
      ) : (
        <p className="text-[11px] text-gray-400 mt-1">Choisissez d'abord le chantier pour filtrer les sous-traitants liés dans Sage X3.</p>
      )}
    </div>
  );
}
