/* global escapeHtml */
/* ================= Specs ================= */

async function loadSpecs() {
  const s = await window.megahub.getSpecs();
  const el = document.getElementById('specs-content');
  if (!s) { el.textContent = 'No se pudo detectar'; return; }
  el.innerHTML = `<b>${escapeHtml(s.cpuName)}</b><br>${s.cores}c/${s.threads}t · ${s.ramGb} GB RAM<br><b>${escapeHtml(s.gpuName)}</b>`;
}

