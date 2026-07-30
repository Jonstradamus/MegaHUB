const { BrowserWindow } = require('electron');
const store = require('../util/store');

// Credenciales públicas del cliente "launcherAppClient2" de Epic Games —
// las mismas que usan Legendary/Heroic (proyectos open source), no son secretas
// en la práctica: cualquier cliente oficial de Epic las trae embebidas.
const CLIENT_ID = '34a02cf8f4414e29b15921876da36f9a';
const CLIENT_SECRET = 'daafbccc737745039dffe53d94fc76cf';
const REDIRECT = `https://www.epicgames.com/id/api/redirect?clientId=${CLIENT_ID}&responseType=code`;
const LOGIN_URL = `https://www.epicgames.com/id/login?redirectUrl=${encodeURIComponent(REDIRECT)}`;

function openLoginWindow(parent) {
  return new Promise((resolve, reject) => {
    const win = new BrowserWindow({
      width: 480, height: 720, parent, modal: true,
      autoHideMenuBar: true, title: 'Conectar con Epic Games',
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    });
    let done = false;
    const tryExtract = async () => {
      if (done) return;
      const url = win.webContents.getURL();
      if (!/id\/api\/redirect/.test(url)) return;
      try {
        const text = await win.webContents.executeJavaScript('document.body.innerText');
        const data = JSON.parse(text);
        if (data.authorizationCode) {
          done = true;
          win.close();
          resolve(data.authorizationCode);
        }
      } catch {}
    };
    win.webContents.on('did-navigate', tryExtract);
    win.webContents.on('did-finish-load', tryExtract);
    win.on('closed', () => { if (!done) reject(new Error('Login cancelado')); });
    win.loadURL(LOGIN_URL);
  });
}

async function tokenRequest(params) {
  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const res = await fetch('https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${auth}` },
    body: new URLSearchParams(params),
  });
  if (!res.ok) throw new Error(`Epic token HTTP ${res.status}`);
  return res.json();
}

async function getValidToken() {
  const auth = store.load('epic-auth');
  if (!auth) return null;
  if (Date.now() < auth.expiresAt - 60000) return auth.access_token;
  try {
    const t = await tokenRequest({ grant_type: 'refresh_token', refresh_token: auth.refresh_token });
    store.save('epic-auth', { ...t, expiresAt: Date.now() + t.expires_in * 1000 });
    return t.access_token;
  } catch {
    return null;
  }
}

// Resuelve título/portada real por catálogo (best-effort: si falla, se conserva el appName crudo)
async function resolveCatalog(records, token) {
  const byNamespace = {};
  for (const r of records) (byNamespace[r.namespace] ||= []).push(r.catalogItemId);
  const info = {};
  for (const [ns, ids] of Object.entries(byNamespace)) {
    try {
      const qs = ids.map(id => `id=${encodeURIComponent(id)}`).join('&');
      const res = await fetch(
        `https://catalog-public-service-prod06.ol.epicgames.com/catalog/api/shared/namespace/${ns}/bulk/items?${qs}&country=US&locale=es&includeMainGameDetails=true`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) continue;
      const data = await res.json();
      for (const [id, item] of Object.entries(data)) {
        const images = item.keyImages || [];
        const img = images.find(i => i.type === 'DieselStoreFrontTall') || images.find(i => i.type === 'Thumbnail');
        info[id] = { title: item.title || null, coverUrl: img ? img.url : null };
      }
    } catch {}
  }
  return info;
}

async function fetchLibrary(token) {
  const res = await fetch('https://library-service.live.use1.on.epicgames.com/library/api/public/items?includeMetadata=false', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Epic library HTTP ${res.status}`);
  const data = await res.json();
  const records = (data.records || []).filter(r => r.namespace && r.namespace !== 'ue');
  const catalog = await resolveCatalog(records, token).catch(() => ({}));

  const games = records.map(r => {
    const info = catalog[r.catalogItemId] || {};
    return {
      id: `epic-${r.appName}`,
      title: info.title || r.appName,
      platform: 'epic', installed: false,
      epicAppName: r.appName,
      storeUrl: `https://store.epicgames.com/es-ES/`,
      coverUrl: info.coverUrl || null,
    };
  });
  store.save('epic-library', { at: Date.now(), games });
  return games;
}

exports.isConnected = () => !!store.load('epic-auth');

exports.login = async function (parentWindow) {
  const code = await openLoginWindow(parentWindow);
  const t = await tokenRequest({ grant_type: 'authorization_code', code });
  store.save('epic-auth', { ...t, expiresAt: Date.now() + t.expires_in * 1000 });
  return fetchLibrary(t.access_token);
};

exports.ownedGames = async function () {
  const token = await getValidToken();
  if (!token) {
    const cached = store.load('epic-library');
    return cached ? cached.games : [];
  }
  try { return await fetchLibrary(token); }
  catch {
    const cached = store.load('epic-library');
    return cached ? cached.games : [];
  }
};
