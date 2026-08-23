const { scanByPublisher } = require('./_regApps');

module.exports = async function scanRockstar() {
  const apps = await scanByPublisher(/rockstar games/i, /^rockstar games launcher$|social club|\bsdk\b|redistributable/i);
  return apps.map(g => ({
    id: `rockstar-${g.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    title: g.title, platform: 'rockstar', installed: true,
    exePath: g.exePath, workDir: g.workDir,
    coverUrl: null,
    installSizeBytes: g.installSizeBytes,
  }));
};
