import { useState, useEffect, Fragment, useCallback } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MoneyDisplay from "./MoneyDisplay";
import { computeNetHT } from "../utils/decompteCalcul";

const INFO_CESSION_POSTES = new Set(["G", "I", "K"]);
const REMB_POSTES = new Set(["H", "J", "L"]);
const AUTO_FROM_A = new Set(["B", "D"]);

const num = (v) => new Intl.NumberFormat("fr-FR").format(Math.round(v || 0));
const parse = (s) => parseInt((s || "").replace(/\D/g, "")) || 0;

// ── Cell atoms ────────────────────────────────────────────────────
function CellReadonly({ value, muted }) {
  return (
    <span className={`tabular-nums ${muted ? "text-gray-400" : "text-gray-600"}`}>
      {value ? num(value) : "—"}
    </span>
  );
}
function CellDerived({ value }) {
  return <span className="italic text-gray-500 tabular-nums">{num(value)}</span>;
}
function CellAuto({ value }) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <span className="text-xs text-amber-500 select-none">⚡</span>
      <span className="italic text-gray-500 tabular-nums">{num(value)}</span>
    </div>
  );
}
function CellCession({ value }) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <span className="text-xs select-none">📋</span>
      <span className="text-green-700 tabular-nums">{num(value)}</span>
    </div>
  );
}
function CellInput({ value, onChange, isTravauxA = false, warn = false }) {
  return (
    <div className="flex items-center justify-end gap-1">
      {warn && <AlertTriangle size={12} className="text-amber-500 flex-shrink-0" title="Cumul inférieur au cumul M-1" />}
      <input
        type="text"
        value={num(value)}
        onChange={e => onChange(e.target.value)}
        className={`w-40 text-right rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-[#EBF5FF] tabular-nums
          ${warn ? "border border-amber-400 text-amber-700 focus:ring-amber-300" : "border border-blue-300"}
          ${isTravauxA ? "font-semibold text-[#087F3E]" : ""}`}
      />
    </div>
  );
}

// Badge Poste A selon statut attachement
function AttachementBadge({ info }) {
  const navigate = useNavigate();
  if (!info) return null;
  const { code, id, statut, contratId } = info;
  if (statut === "Aucun") {
    return (
      <button
        onClick={() => navigate(`/contrats/${contratId}`)}
        className="inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200 hover:opacity-80 transition-opacity"
        title="Initier un dossier d'attachement depuis le contrat"
      >
        Aucun attachement — initier depuis le contrat
        <ExternalLink size={10} />
      </button>
    );
  }
  if (statut === "Rejeté") {
    return (
      <button
        onClick={() => navigate(`/attachements/${id ?? code}`)}
        className="inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded border bg-red-50 text-red-700 border-red-200 hover:opacity-80 transition-opacity"
        title="Ouvrir le dossier rejeté"
      >
        Dossier rejeté — correction requise · {code}
        <ExternalLink size={10} />
      </button>
    );
  }
  const cfg = statut === "Validé"
    ? { cls: "bg-green-50 text-green-700 border-green-200", label: `Attachement validé · ${code}` }
    : statut === "Soumis au DACC"
    ? { cls: "bg-purple-50 text-purple-700 border-purple-200", label: `En attente DACC · ${code}` }
    : { cls: "bg-blue-50 text-blue-600 border-blue-200", label: `En cours · ${code}` };
  return (
    <button
      onClick={() => navigate(`/attachements/${id ?? code}`)}
      className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded border ${cfg.cls} hover:opacity-80 transition-opacity`}
      title="Ouvrir le dossier d'attachement"
    >
      {cfg.label}
      <ExternalLink size={10} />
    </button>
  );
}

export default function DecompteLineTable({
  lignes: initialLignes,
  tauxRG = 5,
  tauxAD = 15,
  tauxRevisionPrix = 0,
  tauxTVA = 18,
  saisieMode = "cumulative",
  editable = false,
  isImport = false,
  infoTotals,
  remboursementInfo,
  attachementInfo,
  onChange,
}) {
  const [rows, setRows] = useState(initialLignes || []);
  const [cExpanded, setCExpanded] = useState(false);

  useEffect(() => { setRows(initialLignes || []); }, [initialLignes]);

  // Cascade B, D, C when A changes (mode-aware) — defined before the effects that use it
  const cascadeFromA = useCallback((rows_, aCumulM, aMensuel) => {
    return rows_.map(r => {
      if (r.codePoste === "D") {
        if (saisieMode === "cumulative") {
          const dCumulM = Math.round(aCumulM * tauxRG / 100);
          return { ...r, cumulM: dCumulM, mensuel: dCumulM - (r.cumulMoins1 || 0) };
        }
        const dM = Math.round(aMensuel * tauxRG / 100);
        return { ...r, mensuel: dM, cumulM: (r.cumulMoins1 || 0) + dM };
      }
      if (r.codePoste === "B") {
        if (tauxRevisionPrix <= 0) return r;
        if (saisieMode === "cumulative") {
          const bCumulM = Math.round(aCumulM * tauxRevisionPrix / 100);
          return { ...r, cumulM: bCumulM, mensuel: bCumulM - (r.cumulMoins1 || 0) };
        }
        const bM = Math.round(aMensuel * tauxRevisionPrix / 100);
        return { ...r, mensuel: bM, cumulM: (r.cumulMoins1 || 0) + bM };
      }
      if (r.codePoste === "C") {
        // avance only — remboursement stays user-entered
        if (saisieMode === "cumulative") {
          const cCumulM = Math.round(aCumulM * tauxAD / 100);
          return { ...r, cumulM: cCumulM, mensuel: cCumulM - (r.cumulMoins1 || 0) };
        }
        const cM = Math.round(aMensuel * tauxAD / 100);
        return { ...r, mensuel: cM, cumulM: (r.cumulMoins1 || 0) + cM };
      }
      return r;
    });
  }, [saisieMode, tauxRG, tauxRevisionPrix, tauxAD]);

  // Poste A passif — force la valeur depuis l'attachement + cascade B/D/C
  useEffect(() => {
    if (!attachementInfo || attachementInfo.statut === "Aucun") return;
    const aMensuel = attachementInfo.montantFinal || 0;
    setRows(prev => {
      const aCumulM = (prev.find(r => r.codePoste === "A")?.cumulMoins1 || 0) + aMensuel;
      let next = prev.map(r => r.codePoste === "A" ? { ...r, mensuel: aMensuel, cumulM: aCumulM } : r);
      return cascadeFromA(next, aCumulM, aMensuel);
    });
  }, [attachementInfo, cascadeFromA]); // eslint-disable-line react-hooks/exhaustive-deps

  // G/I/K from états de cession
  useEffect(() => {
    if (!infoTotals) return;
    setRows(prev => prev.map(r => {
      if (!INFO_CESSION_POSTES.has(r.codePoste)) return r;
      const m = infoTotals[r.codePoste] ?? 0;
      return { ...r, mensuel: m, cumulM: (r.cumulMoins1 || 0) + m };
    }));
  }, [infoTotals]); // eslint-disable-line react-hooks/exhaustive-deps

  // Propagate all automatic row changes to parent (attachment override, G/I/K, cascade)
  useEffect(() => {
    onChange?.(rows);
  }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ─────────────────────────────────────────────────────
  function handleCumulChange(codePoste, rawVal) {
    const cumulM = parse(rawVal);
    setRows(prev => {
      let next = prev.map(r => {
        if (r.codePoste !== codePoste) return r;
        return { ...r, cumulM, mensuel: cumulM - (r.cumulMoins1 || 0) };
      });
      if (codePoste === "A") {
        const aMensuel = cumulM - (next.find(r => r.codePoste === "A")?.cumulMoins1 || 0);
        next = cascadeFromA(next, cumulM, aMensuel);
      }
      onChange?.(next);
      return next;
    });
  }

  function handleMensuelChange(codePoste, rawVal) {
    const mensuel = parse(rawVal);
    setRows(prev => {
      let next = prev.map(r => {
        if (r.codePoste !== codePoste) return r;
        return { ...r, mensuel, cumulM: (r.cumulMoins1 || 0) + mensuel };
      });
      if (codePoste === "A") {
        const aCumulM = (next.find(r => r.codePoste === "A")?.cumulM) || 0;
        next = cascadeFromA(next, aCumulM, mensuel);
      }
      onChange?.(next);
      return next;
    });
  }

  // C remboursement handlers
  function handleCRembCumulChange(rawVal) {
    const cumulRembM = parse(rawVal);
    setRows(prev => {
      const next = prev.map(r => {
        if (r.codePoste !== "C") return r;
        return { ...r, cumulRembM, remboursement: cumulRembM - (r.cumulMoins1Remb || 0) };
      });
      onChange?.(next);
      return next;
    });
  }

  function handleCRembMensuelChange(rawVal) {
    const remboursement = parse(rawVal);
    setRows(prev => {
      const next = prev.map(r => {
        if (r.codePoste !== "C") return r;
        return { ...r, remboursement, cumulRembM: (r.cumulMoins1Remb || 0) + remboursement };
      });
      onChange?.(next);
      return next;
    });
  }

  const net = computeNetHT(rows);
  const tva = Math.round(net * tauxTVA / 100);
  const ttc = net + tva;

  const isCumul = saisieMode === "cumulative";

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-3 font-semibold text-gray-700 w-16">Poste</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-700">Désignation</th>
            <th className="text-right px-4 py-3 font-semibold text-gray-500 whitespace-nowrap text-xs">
              Cumul(M-1)
            </th>
            <th className="text-right px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">
              Mois(M)
              {!isCumul && editable && <span className="ml-1 text-blue-400 text-xs font-normal">↑ saisie</span>}
            </th>
            <th className="text-right px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">
              Cumul(M)
              {isCumul && editable && <span className="ml-1 text-blue-400 text-xs font-normal">↑ saisie</span>}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => {
            const isInfoSigne  = row.signe === "info";
            const isAutoPaste  = AUTO_FROM_A.has(row.codePoste);
            const isCession    = INFO_CESSION_POSTES.has(row.codePoste);
            const isRemb       = REMB_POSTES.has(row.codePoste);
            const isC          = row.codePoste === "C";
            const isTravaux    = row.codePoste === "A";
            const isRG         = row.codePoste === "D";
            // Saisie = not import, not auto, not info (signe), not cession, not C
            const isSaisie     = !isImport && !isAutoPaste && !isInfoSigne && !isCession && !isC;
            const isMuted      = !isTravaux && !isCession && !isRemb && (row.mensuel === 0 && (row.cumulM || 0) === 0);
            const hasRegress   = isSaisie && (row.cumulM || 0) < (row.cumulMoins1 || 0) && (row.cumulM || 0) !== 0;
            const isAPassif    = isTravaux && !!attachementInfo && attachementInfo.statut !== "Aucun";

            const rowBg = isTravaux
              ? (attachementInfo?.statut === "Validé" ? "bg-[#F0FAF4]"
                : attachementInfo?.statut === "Soumis au DACC" ? "bg-purple-50/60"
                : attachementInfo?.statut === "Aucun" ? "bg-[#F0FAF4]"
                : attachementInfo ? "bg-blue-50/60"
                : "bg-[#F0FAF4]")
              : isAutoPaste ? "bg-gray-50/80"
              : isCession   ? "bg-green-50/40"
              : "hover:bg-gray-50";

            // ── Special: poste C ─────────────────────────────────
            if (isC) {
              const rembM   = row.remboursement || 0;
              const rembM1  = row.cumulMoins1Remb || 0;
              const rembCM  = row.cumulRembM || 0;
              const avM     = row.mensuel || 0;
              const avM1    = row.cumulMoins1 || 0;
              const avCM    = row.cumulM || 0;
              const restant = avCM - rembCM;

              return (
                <Fragment key="C">
                  {/* Ligne de synthèse C */}
                  <tr className="bg-blue-50/20 hover:bg-blue-50/40 transition-colors">
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100">C</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => setCExpanded(v => !v)}
                        className="flex items-center gap-2 text-left hover:text-blue-600 transition-colors"
                      >
                        {cExpanded ? <ChevronDown size={13} className="text-gray-400" /> : <ChevronRight size={13} className="text-gray-400" />}
                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 font-medium">info</span>
                        <span className="text-gray-500 italic">{row.poste}</span>
                        <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{tauxAD}%</span>
                      </button>
                    </td>
                    {/* Cumul M-1: remboursement cumulé M-1 */}
                    <td className="px-4 py-2.5 text-right">
                      <CellReadonly value={rembM1} muted />
                    </td>
                    {/* Mois(M): remboursement mensuel */}
                    <td className="px-4 py-2.5 text-right">
                      {!isCumul && editable ? (
                        <CellInput value={rembM} onChange={handleCRembMensuelChange} />
                      ) : (
                        <CellDerived value={rembM} />
                      )}
                    </td>
                    {/* Cumul(M): cumulRembM */}
                    <td className="px-4 py-2.5 text-right">
                      {isCumul && editable ? (
                        <CellInput value={rembCM} onChange={handleCRembCumulChange} />
                      ) : (
                        <CellDerived value={rembCM} />
                      )}
                    </td>
                  </tr>

                  {/* Lignes internes dépliables */}
                  {cExpanded && (
                    <>
                      {[
                        { label: "Montant avance M",      v1: null,  vm: avM,   vc: null,  kind: "auto" },
                        { label: "Cumul avances M-1",     v1: avM1,  vm: null,  vc: null,  kind: "ro"   },
                        { label: "Cumul avances M",       v1: null,  vm: null,  vc: avCM,  kind: "auto" },
                        { label: "Remboursement mensuel", v1: rembM1, vm: rembM, vc: rembCM, kind: "remb" },
                        { label: "Cumul remb. M-1",       v1: rembM1, vm: null,  vc: null,  kind: "ro"   },
                        { label: "Cumul remb. M",         v1: null,  vm: null,  vc: rembCM, kind: "derived" },
                        { label: "Restant à rembourser",  v1: null,  vm: null,  vc: restant, kind: "auto" },
                      ].map((sub, i) => (
                        <tr key={i} className="bg-blue-50/10 border-blue-100">
                          <td className="px-4 py-1 text-gray-300 text-xs text-right">└</td>
                          <td className="px-4 py-1 text-xs text-gray-400 pl-6">{sub.label}</td>
                          <td className="px-4 py-1 text-right text-xs text-gray-400 tabular-nums">{sub.v1 != null ? num(sub.v1) : "—"}</td>
                          <td className="px-4 py-1 text-right text-xs tabular-nums">
                            {sub.vm != null ? (
                              <span className={sub.kind === "remb" ? "text-red-600 font-medium" : "text-gray-400"}>
                                {num(sub.vm)}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-1 text-right text-xs tabular-nums">
                            {sub.vc != null ? (
                              <span className={sub.kind === "auto" ? "text-amber-500" : sub.kind === "remb" ? "text-red-600 font-medium" : "text-gray-400"}>
                                {sub.kind === "auto" && <span className="mr-1">⚡</span>}
                                {num(sub.vc)}
                              </span>
                            ) : "—"}
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </Fragment>
              );
            }

            // ── Standard rows ─────────────────────────────────────
            return (
              <Fragment key={row.codePoste}>
                <tr className={`${rowBg} ${isMuted ? "opacity-50" : ""} transition-colors`}>

                  {/* Code */}
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold ${
                      isInfoSigne  ? "bg-blue-50 text-blue-600 border border-blue-100" :
                      isTravaux   ? "bg-[#087F3E] text-white" :
                      isCession   ? "bg-green-100 text-green-700 border border-green-200" :
                      isAutoPaste ? "bg-amber-50 text-amber-600 border border-amber-100" :
                      "bg-gray-100 text-gray-600 border border-gray-200"
                    }`}>{row.codePoste}</span>
                  </td>

                  {/* Désignation */}
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {isInfoSigne ? (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 font-medium">info</span>
                      ) : (
                        <span className={`font-medium w-4 text-center text-xs ${row.signe === "+" ? "text-[#087F3E]" : row.signe === "-" ? "text-red-600" : "text-gray-400"}`}>
                          {row.signe === "+" ? "+" : row.signe === "-" ? "−" : ""}
                        </span>
                      )}
                      <span className={isTravaux ? "font-semibold text-gray-900" : isInfoSigne ? "text-gray-500 italic" : "text-gray-700"}>
                        {row.poste}
                      </span>
                      {isRG && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{tauxRG}%</span>}
                      {isCession && <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-1.5 py-0.5 rounded font-medium">état de cession</span>}
                      {row.enAttente && <span className="text-xs bg-amber-50 text-amber-600 border border-amber-100 px-1.5 py-0.5 rounded font-medium">En attente</span>}
                      {(isAPassif || (isTravaux && attachementInfo?.statut === "Aucun")) && <AttachementBadge info={attachementInfo} />}
                    </div>
                    {isAPassif && attachementInfo?.statut !== "Validé" && (attachementInfo?.montantFinal || 0) > 0 && (
                      <p className="text-xs text-gray-400 italic mt-0.5">Montant provisoire — en attente de validation du dossier</p>
                    )}
                  </td>

                  {/* Cumul(M-1) — toujours readonly grisé */}
                  <td className="px-4 py-2.5 text-right">
                    <CellReadonly value={row.cumulMoins1} muted />
                  </td>

                  {/* Mois(M) */}
                  <td className="px-4 py-2.5 text-right">
                    {isAPassif ? (
                      <CellDerived value={row.mensuel} />
                    ) : !isCumul && editable && isSaisie ? (
                      <CellInput
                        value={row.mensuel}
                        onChange={v => handleMensuelChange(row.codePoste, v)}
                        isTravauxA={isTravaux}
                      />
                    ) : isAutoPaste ? (
                      <CellAuto value={row.mensuel} />
                    ) : isCession ? (
                      <CellCession value={row.mensuel} />
                    ) : isCumul ? (
                      <CellDerived value={row.mensuel} />
                    ) : (
                      <span className="tabular-nums text-gray-600">{num(row.mensuel)}</span>
                    )}
                  </td>

                  {/* Cumul(M) */}
                  <td className="px-4 py-2.5 text-right">
                    {isAPassif ? (
                      <span className="tabular-nums text-gray-700 font-medium">{num(row.cumulM)}</span>
                    ) : isCumul && editable && isSaisie ? (
                      <CellInput
                        value={row.cumulM}
                        onChange={v => handleCumulChange(row.codePoste, v)}
                        isTravauxA={isTravaux}
                        warn={hasRegress}
                      />
                    ) : isAutoPaste ? (
                      <CellAuto value={row.cumulM} />
                    ) : isCession ? (
                      <CellCession value={row.cumulM} />
                    ) : !isCumul ? (
                      <CellDerived value={row.cumulM} />
                    ) : (
                      <span className="tabular-nums text-gray-700 font-medium">{num(row.cumulM)}</span>
                    )}
                  </td>
                </tr>

                {/* Remboursement info sub-row */}
                {isRemb && remboursementInfo?.[row.codePoste] && (() => {
                  const ri = remboursementInfo[row.codePoste];
                  const overrun = (ri.cumulAnterieur + row.mensuel) > (ri.totalCede + (ri.cumulCedeAnterieur || 0));
                  return (
                    <tr className="bg-gray-50/60">
                      <td colSpan={5} className="px-4 py-2 text-xs text-gray-500">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span>Montant cédé sur la période : <strong className="text-gray-700">{num(ri.totalCede)} FCFA</strong></span>
                          <span>Déjà remboursé (décomptes antérieurs) : <strong className="text-gray-700">{num(ri.cumulAnterieur)} FCFA</strong></span>
                          {overrun && (
                            <span className="flex items-center gap-1 text-amber-700 font-medium">
                              <AlertTriangle size={12} /> Le cumul dépasse le total cédé — vérifiez la saisie.
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })()}
              </Fragment>
            );
          })}
        </tbody>

        {/* ── Totaux ── */}
        <tfoot>
          <tr className="border-t-2 border-[#065A2C] bg-[#0A9A4C]">
            <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-white/90">NET À RÉGLER (HT)</td>
            <td colSpan={2} className="px-4 py-3 text-right">
              <span className="text-xl font-bold text-white tabular-nums">{num(net)} FCFA</span>
            </td>
          </tr>
          <tr className="bg-[#087F3E]">
            <td colSpan={3} className="px-4 py-2 text-sm text-white/70 font-medium">TVA ({tauxTVA}%)</td>
            <td colSpan={2} className="px-4 py-2 text-right text-white/80 tabular-nums font-semibold">{num(tva)} FCFA</td>
          </tr>
          <tr className="bg-[#065A2C]">
            <td colSpan={3} className="px-4 py-3.5 text-base font-bold text-white tracking-wide">NET TTC À PAYER</td>
            <td colSpan={2} className="px-4 py-3.5 text-right">
              <span className="text-2xl font-bold text-white tabular-nums">{num(ttc)} FCFA</span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
