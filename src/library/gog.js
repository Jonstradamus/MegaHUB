const { BrowserWindow } = require('electron');
const store = require('../util/store');

// Client ID/secret públicos de GOG Galaxy (los mismos que usan Heroic/Lutris/Playnite)
const CLIENT_ID = '46899977096215655';
const CLIENT_SECRET = '9d85c43b1482497dbbce61f6e4aa173a433796eeae2ca8c5f6129f2dc4de46d9';
const REDIRECT = 'https://embed.gog.com/on_login_success?origin=client';
const AUTH_URL = `https://auth.gog.com/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT)}&response_type=code&layout=galaxy`;

async function tokenRequest(params) {
  const url = 'https://auth.gog.com/token?' + new URLSearchParams({
    client_id: CLIENT_ID, client_secret: CLIENT_SECRET, ...params,
  });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GOG token HTTP ${res.status}`);
  return res.json();
}

// Abre la ventana de login de GOG; el usuario escribe sus credenciales ahí (nosotros nunca las vemos)
function openLoginWindow(parent) {
  return new Promise((resolve, reject) => {
    const win = new BrowserWindow({
      width: 480, height: 720, parent, modal: true,
      autoHideMenuBar: true, title: 'Conectar con GOG',
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    });
    let done = false;
    const check = (url) => {
      const m = url.match(/on_login_success.*[?&]code=([^&]+)/);
      if (m && !done) { done = true; win.close(); resolve(m[1]); }
    };
    win.webContents.on('will-redirect', (_e, url) => check(url));
    win.webContents.on('did-navigate', (_e, url) => check(url));
    win.on('closed', () => { if (!done) reject(new Error('Login cancelado')); });
    win.loadURL(AUTH_URL);
  });
}

async function getValidToken() {
  const auth = store.load('gog-auth');
  if (!auth) return null;
  if (Date.now() < auth.expiresAt - 60000) return auth.access_token;
  try {
    const t = await tokenRequest({ grant_type: 'refresh_token', refresh_token: auth.refresh_token });
    store.save('gog-auth', { ...t, expiresAt: Date.now() + t.expires_in * 1000 });
    return t.access_token;
  } catch {
    return null;
  }
}

async function fetchLibrary(token) {
  const games = [];
  let page = 1, totalPages = 1;
  do {
    const res = await fetch(`https://embed.gog.com/account/getFilteredProducts?mediaType=1&page=${page}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`GOG library HTTP ${res.status}`);
    const data = await res.json();
    totalPages = data.totalPages || 1;
    for (const p of data.products || []) {
      games.push({
        id: `gog-${p.id}`,
        title: p.title,
        platform: 'gog', installed: false,
        gogProductId: p.id,
        storeUrl: p.url ? `https://www.gog.com${p.url}` : null,
        coverUrl: p.image ? `https:${p.image}_glx_vertical_cover.jpg` : null,
        genre: p.category || null,
        releaseYear: null,
      });
    }
    page++;
  } while (page <= totalPages);
  store.save('gog-library', { at: Date.now(), games });
  return games;
}

exports.isConnected = () => !!store.load('gog-auth');

exports.login = async function (parentWindow) {
  const code = await openLoginWindow(parentWindow);
  const t = await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT });
  store.save('gog-auth', { ...t, expiresAt: Date.now() + t.expires_in * 1000 });
  return fetchLibrary(t.access_token);
};

exports.ownedGames = async function () {
  const token = await getValidToken();
  if (!token) {
    const cached = store.load('gog-library');
    return cached ? cached.games : [];
  }
  try { return await fetchLibrary(token); }
  catch {
    const cached = store.load('gog-library');
    return cached ? cached.games : [];
  }
};
