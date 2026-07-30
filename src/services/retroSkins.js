// Instalación automática de skins/temas para el menú de RetroArch (XMB/RGUI).
// Lista corta y curada — a diferencia de emuladores/cores (con fuentes
// oficiales verificables), los temas son proyectos de comunidad dispersos,
// así que cada entrada fue revisada a mano (estructura del repo, tamaño,
// instrucciones de instalación oficiales del propio autor) en vez de
// adivinarse. Igual que emulatorDownload.js: SIEMPRE con confirmación
// explícita antes de bajar nada, y nunca se ejecuta un archivo descargado.
const fs = require('fs');
const path = require('path');
const os = require('os');
const sevenZip = require('7zip-min');
const scanRetroArch = require('../scanners/retroarch');

// Cada skin declara EXACTAMENTE qué copiar del archivo descargado y a dónde,
// verificado contra el README real de cada proyecto (no un heurístico
// genérico) — así no hay sorpresas con estructuras de repo distintas entre sí.
const RETRO_SKINS = [
  {
    id: 'ps3-icons',
    name: 'PS3 Icons + Sounds',
    creator: 'JMRDev0',
    creatorUrl: 'https://github.com/JMRDev0',
    sourceUrl: 'https://github.com/JMRDev0/XMB-PS3-Icons-Sounds-Pack',
    description: 'Iconos, sonidos y tipografía al estilo XMB de PlayStation 3.',
    menuDriver: 'xmb',
    slot: 'systematic', // sobreescribe el tema oficial "Systematic" — se hace backup antes
    archiveUrl: 'https://raw.githubusercontent.com/JMRDev0/XMB-PS3-Icons-Sounds-Pack/main/PS3%20Icons%20%2B%20Sounds.zip',
    archiveKind: 'direct', // el .zip YA es justo el contenido a copiar, sin pelar carpetas del repo
    contentPath: 'PS3 Icons + Sounds/Icons/systematic',
    sizeMb: 2.3,
  },
  {
    id: 'materialdesign',
    name: 'Material Design',
    creator: 'RobLoach',
    creatorUrl: 'https://github.com/RobLoach',
    sourceUrl: 'https://github.com/RobLoach/retroarch-theme-materialdesign',
    description: 'Iconos y tipografía Roboto siguiendo el lenguaje visual Material Design.',
    menuDriver: 'xmb',
    slot: 'custom', // ranura "Custom" del menú — instalar otro tema Custom la reemplaza
    archiveUrl: 'https://codeload.github.com/RobLoach/retroarch-theme-materialdesign/zip/refs/heads/master',
    archiveKind: 'repo-files', // copiar solo estos archivos/carpetas desde la raíz del repo
    rootItems: ['font.ttf', 'png'],
    sizeMb: 4.5,
  },
  {
    id: 'rgui-pepcodes',
    name: 'RGUI Themes (PepCodes)',
    creator: 'PepCodes',
    creatorUrl: 'https://github.com/PepCodes',
    sourceUrl: 'https://github.com/PepCodes/RGUI-Themes',
    description: '18 presets de color (Cupertino, PlayStation, Wii, Redmond…) para el menú RGUI, en variante centrada y ancho completo.',
    menuDriver: 'rgui',
    slot: null, // se fusiona en assets/rgui/ sin reemplazar nada — cada preset es un .cfg con nombre propio
    archiveUrl: 'https://codeload.github.com/PepCodes/RGUI-Themes/zip/refs/heads/master',
    archiveKind: 'repo-subfolder',
    contentSubfolder: 'rgui',
    sizeMb: 1.3,
  },
];

function listSkins() {
  return RETRO_SKINS.map(({ archiveUrl, archiveKind, contentPath, rootItems, contentSubfolder, ...pub }) => pub);
}

function findSkin(id) {
  return RETRO_SKINS.find(s => s.id === id) || null;
}

// El .cfg de RetroArch no expone una carpeta "assets" configurable de forma
// simple de leer sin parsear todo el archivo — se asume la ubicación estándar
// junto al ejecutable (como hace findPlaylistsDir para las playlists), con el
// mismo fallback a AppData que usa el resto de la app.
function getAssetsDir() {
  const exe = scanRetroArch.findRetroArch();
  if (!exe) return null;
  const nearby = path.join(path.dirname(exe), 'assets');
  if (fs.existsSync(nearby)) return nearby;
  const appdata = path.join(os.homedir(), 'AppData\\Roaming\\RetroArch\\assets');
  if (fs.existsSync(appdata)) return appdata;
  return null;
}

async function rmrf(dir) {
  try { await fs.promises.rm(dir, { recursive: true, force: true }); } catch {}
}

async function copyDir(src, dest) {
  await fs.promises.mkdir(dest, { recursive: true });
  const entries = await fs.promises.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) await copyDir(s, d);
    else if (entry.isFile()) await fs.promises.copyFile(s, d);
  }
}

async function downloadToFile(url, destPath) {
  const res = await fetch(url, { headers: { 'User-Agent': 'MegaHUB/0.2 (RetroArch skin installer)' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.promises.writeFile(destPath, buf);
  return buf.length;
}

// El zip de GitHub (codeload) siempre trae un único folder raíz "<repo>-<rama>/".
async function findSingleTopDir(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const dirs = entries.filter(e => e.isDirectory());
  return dirs.length === 1 ? path.join(dir, dirs[0].name) : dir;
}

async function installSkin(id) {
  const skin = findSkin(id);
  if (!skin) return { error: 'Skin no encontrada.' };
  const assetsDir = getAssetsDir();
  if (!assetsDir) return { error: 'No se detectó la carpeta assets/ de RetroArch. Instala/abre RetroArch al menos una vez primero.' };

  const tmpRoot = path.join(os.tmpdir(), `megahub-skin-${id}-${Date.now()}`);
  const archivePath = path.join(tmpRoot, 'archive.zip');
  const extractDir = path.join(tmpRoot, 'extracted');
  try {
    await fs.promises.mkdir(tmpRoot, { recursive: true });
    await downloadToFile(skin.archiveUrl, archivePath);
    await new Promise((resolve, reject) => {
      sevenZip.unpack(archivePath, extractDir, (err) => (err ? reject(err) : resolve()));
    });

    // Resuelve la carpeta de origen (lo que de verdad hay que copiar) según el
    // tipo de archivo declarado por cada skin.
    let sourceDir;
    if (skin.archiveKind === 'direct') {
      sourceDir = path.join(extractDir, skin.contentPath);
    } else {
      const repoRoot = await findSingleTopDir(extractDir);
      if (skin.archiveKind === 'repo-subfolder') {
        sourceDir = path.join(repoRoot, skin.contentSubfolder);
      } else if (skin.archiveKind === 'repo-files') {
        // Se arma una carpeta temporal solo con los ítems declarados, para
        // reusar el mismo copyDir() del resto de los casos.
        sourceDir = path.join(tmpRoot, 'picked');
        await fs.promises.mkdir(sourceDir, { recursive: true });
        for (const item of skin.rootItems) {
          const s = path.join(repoRoot, item);
          const d = path.join(sourceDir, item);
          const stat = await fs.promises.stat(s).catch(() => null);
          if (!stat) continue;
          if (stat.isDirectory()) await copyDir(s, d);
          else await fs.promises.copyFile(s, d);
        }
      }
    }
    if (!sourceDir || !fs.existsSync(sourceDir)) {
      return { error: 'El archivo descargado no tiene la estructura esperada (¿cambió el repo del autor?).' };
    }

    // Destino: ranura de tema (XMB) o assets/rgui (fusión, sin reemplazar nada).
    const destDir = skin.slot
      ? path.join(assetsDir, skin.menuDriver, skin.slot)
      : path.join(assetsDir, skin.menuDriver);

    // Backup del contenido original de la ranura — solo la PRIMERA vez que se
    // toca (si ya hay un backup, no se vuelve a pisar con la versión de un
    // skin anterior), para que "restaurar" siempre vuelva al RetroArch de
    // fábrica, sin importar cuántos skins se probaron después.
    if (skin.slot) {
      const backupDir = path.join(assetsDir, skin.menuDriver, `${skin.slot}.megahub-original`);
      if (!fs.existsSync(backupDir) && fs.existsSync(destDir)) {
        await copyDir(destDir, backupDir);
      }
    }

    await copyDir(sourceDir, destDir);
    await fs.promises.writeFile(
      path.join(destDir, '.megahub-skin.json'),
      JSON.stringify({ id: skin.id, name: skin.name, installedAt: Date.now() })
    );

    return { ok: true, destDir, menuDriver: skin.menuDriver, slot: skin.slot };
  } catch (e) {
    return { error: String(e.message || e) };
  } finally {
    await rmrf(tmpRoot);
  }
}

// Estado actual de cada skin: instalado (y si lo instaló MegaHUB, vía el
// marcador .megahub-skin.json) o no.
function getSkinsStatus() {
  const assetsDir = getAssetsDir();
  return RETRO_SKINS.map((skin) => {
    if (!assetsDir) return { id: skin.id, installed: false, retroArchFound: false };
    const destDir = skin.slot ? path.join(assetsDir, skin.menuDriver, skin.slot) : path.join(assetsDir, skin.menuDriver);
    const markerPath = path.join(destDir, '.megahub-skin.json');
    let installed = false, installedAt = null;
    try {
      const marker = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
      installed = marker.id === skin.id;
      installedAt = marker.installedAt;
    } catch {}
    return { id: skin.id, installed, installedAt, retroArchFound: true };
  });
}

async function restoreSlot(id) {
  const skin = findSkin(id);
  if (!skin || !skin.slot) return { error: 'Esta skin no tiene original que restaurar.' };
  const assetsDir = getAssetsDir();
  if (!assetsDir) return { error: 'No se detectó RetroArch.' };
  const destDir = path.join(assetsDir, skin.menuDriver, skin.slot);
  const backupDir = path.join(assetsDir, skin.menuDriver, `${skin.slot}.megahub-original`);
  if (!fs.existsSync(backupDir)) return { error: 'No hay una copia original guardada para restaurar (el tema ya estaba modificado antes de instalar la skin).' };
  await rmrf(destDir);
  await copyDir(backupDir, destDir);
  return { ok: true };
}

module.exports = { listSkins, installSkin, getSkinsStatus, restoreSlot, getAssetsDir };
