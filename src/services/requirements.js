// Analizador de requisitos: compara el hardware del PC contra los requisitos
// mínimos/recomendados de un juego. Heurístico — es una ESTIMACIÓN, no un benchmark.

function stripHtml(html) {
  return html.replace(/<br\s*\/?>/gi, '\n').replace(/<li>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');
}

function extractField(text, keys) {
  for (const line of text.split('\n')) {
    const clean = line.trim();
    for (const k of keys) {
      const re = new RegExp(`^${k}\\s*:?\\s*(.+)`, 'i');
      const m = clean.match(re);
      if (m && m[1].trim()) return m[1].trim();
    }
  }
  return null;
}

/* ---- Puntuación de GPU (heurística por familia/modelo) ---- */
function gpuScore(name) {
  if (!name) return null;
  const n = name.toLowerCase();
  const scores = [];
  // NVIDIA RTX/GTX 4 dígitos: RTX 3060, GTX 1660...
  for (const m of n.matchAll(/(rtx|gtx)\s*(\d{4})(\s*ti|ti)?(\s*super)?/g)) {
    const gen = parseInt(m[2].slice(0, 2), 10);  // 10,16,20,30,40,50
    const tier = parseInt(m[2].slice(2), 10);    // 50,60,70,80,90
    let s = gen * 22 + tier * 6;
    if (m[3]) s *= 1.12;
    if (m[4]) s *= 1.08;
    scores.push(s);
  }
  // NVIDIA 3 dígitos: GTX 970, GTX 760...
  for (const m of n.matchAll(/gtx?\s*([4-9])([0-9]0)\b/g)) {
    scores.push(parseInt(m[1], 10) * 16 + parseInt(m[2], 10) * 3.5);
  }
  // AMD RX 4 dígitos: RX 6700 XT, RX 7800...
  for (const m of n.matchAll(/rx\s*(\d)(\d)(\d0)(\s*xt|xt)?/g)) {
    const gen = parseInt(m[1], 10) * 10; // 5x00→50, 6x00→60, 7x00→70, 9x00→90
    let s = gen * 20 + parseInt(m[2] + m[3], 10) * 0.9;
    if (m[4]) s *= 1.1;
    scores.push(s);
  }
  // AMD RX 3 dígitos: RX 580, RX 480...
  for (const m of n.matchAll(/rx\s*([4-5])([0-9]0)\b/g)) {
    scores.push(300 + parseInt(m[1] + m[2], 10) * 0.4);
  }
  // Intel Arc
  for (const m of n.matchAll(/arc\s*a(\d{3})/g)) {
    scores.push(350 + parseInt(m[1], 10) * 0.6);
  }
  // Gráficas antiguas/integradas conocidas
  if (!scores.length) {
    if (/radeon hd|geforce [1-9]\d{2}\b|gt\s*\d{3}\b/i.test(n)) scores.push(120);
    if (/intel.*(hd|uhd|iris)/.test(n)) scores.push(90);
  }
  return scores.length ? Math.max(...scores) : null;
}

// Para requisitos que listan varias GPUs ("GTX 1060 o RX 580"), basta la más débil
function gpuReqScore(text) {
  if (!text) return null;
  const parts = text.split(/,|\bor\b|\bo\b|\//i);
  const scores = parts.map(gpuScore).filter(s => s != null);
  return scores.length ? Math.min(...scores) : gpuScore(text);
}

/* ---- Puntuación de CPU ---- */
function cpuScore(name, cores) {
  if (!name) return null;
  const n = name.toLowerCase();
  let s = null;
  let m = n.match(/i([3579])[- ](\d{4,5})/);
  if (m) {
    const fam = parseInt(m[1], 10);
    const gen = m[2].length === 5 ? parseInt(m[2].slice(0, 2), 10) : parseInt(m[2][0], 10);
    s = fam * 9 + gen * 7;
  }
  if (s == null) {
    m = n.match(/ryzen\s*([3579])\s*(\d{4})/);
    if (m) {
      const fam = parseInt(m[1], 10);
      const gen = parseInt(m[2][0], 10);
      s = fam * 9 + gen * 8 + 8;
    }
  }
  if (s == null) {
    m = n.match(/(\d+(?:\.\d+)?)\s*ghz/);
    if (m) s = parseFloat(m[1]) * 12;
  }
  if (s == null && /fx[- ]?\d{4}|phenom|core 2|athlon/i.test(n)) s = 22;
  if (s == null) return null;
  if (cores) s *= 1 + Math.min(cores, 16) / 24;
  return s;
}

function ramGb(text) {
  if (!text) return null;
  const m = text.match(/(\d+)\s*(gb|mb)/i);
  if (!m) return null;
  return m[2].toLowerCase() === 'mb' ? parseInt(m[1], 10) / 1024 : parseInt(m[1], 10);
}

function pct(userScore, reqScore) {
  if (userScore == null || reqScore == null || reqScore <= 0) return null;
  const raw = (userScore / reqScore) * 100;
  // Sin techo artificial: un PC muy superior debe reflejarse como tal (300%, 500%...).
  // Solo se acota un máximo defensivo para blindar contra falsos positivos de parseo.
  return Math.round(Math.max(0, Math.min(500, raw)));
}

function analyzeTier(reqHtml, specs) {
  if (!reqHtml) return null;
  const text = stripHtml(reqHtml);
  const cpuReq = extractField(text, ['Procesador', 'Processor', 'CPU']);
  const gpuReq = extractField(text, ['Gráficos', 'Tarjeta gráfica', 'Graphics', 'Video Card', 'GPU']);
  const ramReq = extractField(text, ['Memoria', 'Memory', 'RAM']);

  const comps = {
    gpu: { req: gpuReq, pct: pct(gpuScore(specs.gpuName), gpuReqScore(gpuReq)) },
    cpu: { req: cpuReq, pct: pct(cpuScore(specs.cpuName, specs.cores), cpuScore(cpuReq, null)) },
    ram: { req: ramReq, pct: pct(specs.ramGb, ramGb(ramReq)) },
  };
  const weights = { gpu: 0.45, cpu: 0.35, ram: 0.2 };
  let total = 0, wsum = 0;
  for (const [k, c] of Object.entries(comps)) {
    if (c.pct != null) { total += c.pct * weights[k]; wsum += weights[k]; }
  }
  return { components: comps, overall: wsum ? Math.round(total / wsum) : null };
}

// Clasifica un porcentaje "puro" (solo se usa cuando no hay con qué compararlo,
// p.ej. el juego no publica requisitos recomendados).
function gradeOverall(pct) {
  if (pct >= 200) return 'excelente';
  if (pct >= 130) return 'sobrado';
  if (pct >= 100) return 'cumple';
  if (pct >= 70) return 'justo';
  return 'insuficiente';
}

module.exports = function analyze(requirements, specs) {
  if (!specs) return null;
  const minimum = analyzeTier(requirements.minimum, specs);
  const recommended = analyzeTier(requirements.recommended, specs);

  let verdict = null;
  let verdictBasis = null;

  if (recommended && recommended.overall != null) {
    if (recommended.overall >= 100) {
      verdict = recommended.overall >= 200 ? 'excelente' : recommended.overall >= 130 ? 'sobrado' : 'cumple';
      verdictBasis = 'recommended-met';
    } else if (minimum && minimum.overall != null && minimum.overall >= 100) {
      // No alcanza lo recomendado, pero los mínimos sí con margen real.
      verdict = 'cumple';
      verdictBasis = 'below-recommended';
    } else if (minimum && minimum.overall != null && minimum.overall >= 70) {
      verdict = 'justo';
      verdictBasis = 'minimum';
    } else {
      verdict = 'insuficiente';
      verdictBasis = 'minimum';
    }
  } else if (minimum && minimum.overall != null) {
    // El juego no publica requisitos recomendados: graduar según cuánto se
    // superan los mínimos, en vez de meter todo en la misma etiqueta "cumple".
    verdict = gradeOverall(minimum.overall);
    verdictBasis = 'minimum-only';
  }

  return { minimum, recommended, verdict, verdictBasis, specs };
};
