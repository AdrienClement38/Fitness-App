/** Export RGPD : les données d'entraînement de l'utilisateur, en JSON téléchargeable. */
function readJson(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}

export function exportMyData(email: string | null) {
  const data = {
    app: 'AC-KINETIK',
    exportedAt: new Date().toISOString(),
    compte: {email},
    seances: readJson('workout-logs'),
    seanceEnCours: readJson('active-workout'),
    programmesPerso: readJson('my-programs'),
    favoris: readJson('salle-favorites'),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ac-kinetik-donnees-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
