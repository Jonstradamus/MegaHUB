const { scanByPublisher } = require('./_regApps');

module.exports = async function scanUbisoft() {
  const apps = scanByPublisher(/ubisoft/i, /ubisoft connect|^uplay$/i);
  return apps.map(g => ({
    id: `ubisoft-${g.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    title: g.title, platform: 'ubisoft', installed: true,
    exePath: g.exePath, workDir: g.workDir,
    coverUrl: null,
    installSizeBytes: g.installSizeBytes,
  }));
};
