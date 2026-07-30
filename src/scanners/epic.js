const fs = require('fs');
const path = require('path');

const MANIFESTS_DIR = 'C:\\ProgramData\\Epic\\EpicGamesLauncher\\Data\\Manifests';

module.exports = async function scanEpic() {
  if (!fs.existsSync(MANIFESTS_DIR)) return [];
  const games = [];
  for (const file of fs.readdirSync(MANIFESTS_DIR).filter(f => f.endsWith('.item'))) {
    try {
      const m = JSON.parse(fs.readFileSync(path.join(MANIFESTS_DIR, file), 'utf8'));
      // Los DLC y addons tienen AppCategories sin "games" o bIsApplication false
      if (m.bIsIncompleteInstall) continue;
      if (Array.isArray(m.AppCategories) && !m.AppCategories.includes('games') && !m.AppCategories.includes('applications')) continue;
      if (!m.DisplayName || !m.AppName) continue;
      games.push({
        id: `epic-${m.AppName}`,
        title: m.DisplayName,
        platform: 'epic',
        launchUri: `com.epicgames.launcher://apps/${m.CatalogNamespace}%3A${m.CatalogItemId}%3A${m.AppName}?action=launch&silent=true`,
        coverUrl: null,
        installDir: m.InstallLocation || null,
        // Exacto — el manifiesto de Epic ya trae el tamaño total de instalación.
        installSizeBytes: typeof m.InstallSize === 'number' ? m.InstallSize : null,
      });
    } catch {}
  }
  // Deduplicar (a veces hay manifiestos repetidos)
  const seen = new Set();
  return games.filter(g => (seen.has(g.id) ? false : seen.add(g.id)));
};
