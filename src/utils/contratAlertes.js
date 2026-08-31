export function computeAlerteDelai(contrat) {
  if (!contrat.dateDebut || !contrat.dateFin) return null;
  if (!["En cours d'exécution", "Suspendu"].includes(contrat.statut)) return null;

  const debut = new Date(contrat.dateDebut).getTime();
  const fin   = new Date(contrat.dateFin).getTime();
  const now   = Date.now();

  if (fin <= debut) return null;
  const pct = Math.round(((now - debut) / (fin - debut)) * 100);

  if (pct >= 100) {
    return {
      type: "danger",
      titre: `Délai dépassé — ${contrat.code}`,
      message: `La date de fin contractuelle (${new Date(contrat.dateFin).toLocaleDateString("fr-FR")}) est dépassée.`,
      contratId: contrat.id,
      pct,
    };
  }
  if (pct >= 80) {
    return {
      type: "warning",
      titre: `Délai bientôt atteint — ${contrat.code}`,
      message: `${pct}% du délai contractuel écoulé. Fin prévue le ${new Date(contrat.dateFin).toLocaleDateString("fr-FR")}.`,
      contratId: contrat.id,
      pct,
    };
  }
  return null;
}

export function computeAlertesDelai(contrats) {
  return contrats.map(computeAlerteDelai).filter(Boolean);
}
