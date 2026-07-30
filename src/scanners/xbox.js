const { execFile, spawn } = require('child_process');

// Los juegos Xbox/Game Pass modernos incluyen MicrosoftGame.config en su carpeta
const PS_SCRIPT = `
$out = @()
Get-AppxPackage | ForEach-Object {
  $loc = $_.InstallLocation
  if ($loc -and (Test-Path (Join-Path $loc 'MicrosoftGame.config'))) {
    try {
      [xml]$man = Get-Content (Join-Path $loc 'AppxManifest.xml') -ErrorAction Stop
      $appId = ($man.Package.Applications.Application | Select-Object -First 1).Id
      $disp = $man.Package.Properties.DisplayName
      if (-not $disp -or $disp -like 'ms-resource*') { $disp = $_.Name }
      $out += [pscustomobject]@{ name = $disp; pfn = $_.PackageFamilyName; appid = $appId; installDir = $loc }
    } catch {}
  }
}
$out | ConvertTo-Json -Compress
`;

module.exports = function scanXbox() {
  return new Promise((resolve) => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', PS_SCRIPT],
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, timeout: 30000 },
      (err, stdout) => {
        if (err || !stdout.trim()) return resolve([]);
        let items;
        try { items = JSON.parse(stdout); } catch { return resolve([]); }
        if (!Array.isArray(items)) items = [items];
        resolve(items.filter(i => i && i.pfn && i.appid).map(i => ({
          id: `xbox-${i.pfn}`,
          title: i.name,
          platform: 'xbox', installed: true,
          xboxAumid: `${i.pfn}!${i.appid}`,
          coverUrl: null,
          installDir: i.installDir || null,
        })));
      });
  });
};

module.exports.launch = function launchXbox(game) {
  spawn('explorer.exe', [`shell:AppsFolder\\${game.xboxAumid}`], { detached: true, stdio: 'ignore' }).unref();
};
