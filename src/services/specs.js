const { execFile } = require('child_process');

const PS = `
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
$gpus = Get-CimInstance Win32_VideoController | Where-Object { $_.AdapterDACType -or $_.VideoProcessor } | Select-Object Name
$ram = (Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory
[pscustomobject]@{
  cpuName = $cpu.Name.Trim()
  cores = $cpu.NumberOfCores
  threads = $cpu.NumberOfLogicalProcessors
  clockMhz = $cpu.MaxClockSpeed
  gpus = @($gpus | ForEach-Object { $_.Name })
  ramBytes = $ram
} | ConvertTo-Json -Compress
`;

let cached = null;

module.exports = function getSpecs() {
  if (cached) return Promise.resolve(cached);
  return new Promise((resolve) => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', PS],
      { encoding: 'utf8', timeout: 20000 },
      (err, stdout) => {
        if (err || !stdout.trim()) return resolve(null);
        try {
          const s = JSON.parse(stdout);
          // Elegir la GPU dedicada (descartar iGPU si hay más de una)
          const gpus = Array.isArray(s.gpus) ? s.gpus : [s.gpus];
          const dedicated = gpus.find(g => /nvidia|geforce|radeon rx|radeon r9|arc/i.test(g)) || gpus[0] || '';
          cached = {
            cpuName: s.cpuName, cores: s.cores, threads: s.threads,
            clockGhz: s.clockMhz / 1000,
            gpuName: dedicated,
            ramGb: Math.round(s.ramBytes / (1024 ** 3)),
          };
          resolve(cached);
        } catch { resolve(null); }
      });
  });
};
