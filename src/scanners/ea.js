const { scanByPublisher } = require('./_regApps');

module.exports = async function scanEa() {
  const apps = await scanByPublisher(/electronic arts/i, /^ea app$|^origin$/i);
  return apps.map(g => ({
    id: `ea-${g.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    title: g.title, platform: 'ea', installed: true,
    exePath: g.exePath, workDir: g.workDir,
    coverUrl: null,
    installSizeBytes: g.installSizeBytes,
  }));
};
