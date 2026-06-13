"use strict";

const cfg = window.APP_CONFIG || {};
const el = (id) => document.getElementById(id);

// State
let columns = [];      // [{ label, type, idx }]  (idx = original column index)
let rows = [];         // [[cell, cell, ...]]  (full, unfiltered by column)
let sortCol = -1;      // index into `columns`
let sortDir = 1;       // 1 asc, -1 desc

// Apply config to the page chrome
if (cfg.TITLE) { el("title").textContent = cfg.TITLE; document.title = cfg.TITLE; }
if (cfg.SUBTITLE) { el("subtitle").textContent = cfg.SUBTITLE; }
if (cfg.TABLE_TITLE) { el("table-title").textContent = cfg.TABLE_TITLE; }

const cta = el("cta");
if (cfg.FORM_URL) {
  cta.href = cfg.FORM_URL;
  if (cfg.CTA_LABEL) cta.textContent = cfg.CTA_LABEL;
  cta.hidden = false;
}

function setStatus(msg, isError) {
  const s = el("status");
  s.className = "status" + (isError ? " error" : "");
  s.innerHTML = msg;
}

// gviz endpoint — works for any sheet shared "Anyone with the link → Viewer".
function buildUrl() {
  const id = (cfg.SHEET_ID || "").trim();
  if (!id) return null;
  let url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(id)}/gviz/tq?tqx=out:json`;
  if (cfg.SHEET_NAME && cfg.SHEET_NAME.trim()) url += `&sheet=${encodeURIComponent(cfg.SHEET_NAME.trim())}`;
  const headers = Number.isInteger(cfg.HEADER_ROWS) ? cfg.HEADER_ROWS : 1;
  url += `&headers=${headers}`;
  return url;
}

// gviz wraps the JSON: /*O_o*/ google.visualization.Query.setResponse({...});
function parseGviz(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Unexpected response from Google.");
  return JSON.parse(text.slice(start, end + 1));
}

function cellText(cell) {
  if (cell == null) return "";
  if (cell.f != null) return cell.f;
  if (cell.v == null) return "";
  return String(cell.v);
}

// Restrict to the COLUMNS allowlist (by header label), preserving its order.
// Empty / missing allowlist => show every column.
function pickColumns(allCols) {
  const allow = Array.isArray(cfg.COLUMNS) ? cfg.COLUMNS : [];
  if (allow.length === 0) return allCols;
  const out = [];
  allow.forEach((wanted) => {
    const match = allCols.find((c) => c.label.toLowerCase() === wanted.toLowerCase());
    if (match) out.push(match);
  });
  return out;
}

async function load() {
  const url = buildUrl();
  if (!url) {
    setStatus("No sheet configured yet. Set <code>SHEET_ID</code> in <code>config.js</code>.", true);
    return;
  }

  setStatus("Lädt…");
  el("table").hidden = true;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = parseGviz(await res.text());

    if (data.status === "error") {
      const reason = (data.errors && data.errors[0] && data.errors[0].detailed_message) || "Unknown error";
      throw new Error(reason);
    }

    const allCols = (data.table.cols || []).map((c, i) => ({
      label: (c.label && c.label.trim()) || `Spalte ${i + 1}`,
      type: c.type,
      idx: i,
    }));

    columns = pickColumns(allCols);
    rows = (data.table.rows || []).map((r) => (r.c || []).map(cellText));

    sortCol = -1;
    render();
    const when = new Date().toLocaleTimeString("de-CH");
    el("meta").textContent = `${rows.length} Team${rows.length === 1 ? "" : "s"} · ${when}`;
  } catch (err) {
    setStatus(
      `Daten konnten nicht geladen werden: <code>${escapeHtml(err.message)}</code>.<br>` +
      "Ist die Tabelle als „Jeder mit dem Link → Betrachter“ freigegeben?",
      true
    );
    el("meta").textContent = "";
  }
}

function render() {
  const filter = el("search").value.trim().toLowerCase();
  const cols = columns;

  // Project each row down to the visible columns.
  let view = rows.map((r) => cols.map((c) => r[c.idx] || ""));

  if (filter) view = view.filter((r) => r.some((c) => c.toLowerCase().includes(filter)));

  if (sortCol >= 0) {
    const numeric = cols[sortCol] && cols[sortCol].type === "number";
    view = view.slice().sort((a, b) => {
      let x = a[sortCol] || "", y = b[sortCol] || "";
      if (numeric) {
        x = parseFloat(x.replace(/[^0-9.\-]/g, "")) || 0;
        y = parseFloat(y.replace(/[^0-9.\-]/g, "")) || 0;
        return (x - y) * sortDir;
      }
      return x.localeCompare(y, "de", { numeric: true }) * sortDir;
    });
  }

  // Header
  const thead = el("thead");
  thead.innerHTML = "";
  const tr = document.createElement("tr");
  cols.forEach((c, i) => {
    const th = document.createElement("th");
    th.textContent = c.label;
    if (i === sortCol) {
      const arrow = document.createElement("span");
      arrow.className = "arrow";
      arrow.textContent = sortDir === 1 ? "▲" : "▼";
      th.appendChild(arrow);
    }
    th.addEventListener("click", () => {
      if (sortCol === i) sortDir = -sortDir;
      else { sortCol = i; sortDir = 1; }
      render();
    });
    tr.appendChild(th);
  });
  thead.appendChild(tr);

  // Body
  const tbody = el("tbody");
  tbody.innerHTML = "";
  const frag = document.createDocumentFragment();
  view.forEach((r) => {
    const row = document.createElement("tr");
    r.forEach((cell) => {
      const td = document.createElement("td");
      td.textContent = cell;
      row.appendChild(td);
    });
    frag.appendChild(row);
  });
  tbody.appendChild(frag);

  el("table").hidden = cols.length === 0 || view.length === 0;
  if (cols.length === 0) {
    setStatus("Keine Spalten konfiguriert.", false);
  } else if (rows.length === 0) {
    setStatus("Noch keine Anmeldungen – sei das erste Team! 🏑", false);
  } else if (view.length === 0) {
    setStatus("Kein Team passt zum Filter.", false);
  } else {
    setStatus("");
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

el("search").addEventListener("input", render);
el("refresh").addEventListener("click", load);

load();
