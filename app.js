"use strict";

const cfg = window.APP_CONFIG || {};
const el = (id) => document.getElementById(id);

// State
let columns = [];      // [{ label, type }]
let rows = [];         // [[cell, cell, ...]]
let sortCol = -1;
let sortDir = 1;       // 1 asc, -1 desc

// Apply config to the page chrome
if (cfg.TITLE) { el("title").textContent = cfg.TITLE; document.title = cfg.TITLE; }
if (cfg.SUBTITLE) { el("subtitle").textContent = cfg.SUBTITLE; }

function setStatus(msg, isError) {
  const s = el("status");
  s.className = "status" + (isError ? " error" : "");
  s.innerHTML = msg;
}

// Build the gviz endpoint URL. This works for any sheet shared as
// "Anyone with the link can view" — no API key required.
function buildUrl() {
  const id = (cfg.SHEET_ID || "").trim();
  if (!id) return null;
  let url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(id)}/gviz/tq?tqx=out:json`;
  if (cfg.SHEET_NAME && cfg.SHEET_NAME.trim()) {
    url += `&sheet=${encodeURIComponent(cfg.SHEET_NAME.trim())}`;
  }
  return url;
}

// The gviz response is wrapped like:  /*O_o*/ google.visualization.Query.setResponse({...});
function parseGviz(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Unexpected response from Google.");
  return JSON.parse(text.slice(start, end + 1));
}

function cellText(cell) {
  if (cell == null) return "";
  if (cell.f != null) return cell.f;          // formatted value if present
  if (cell.v == null) return "";
  return String(cell.v);
}

async function load() {
  const url = buildUrl();
  if (!url) {
    setStatus(
      "No sheet configured yet. Open <code>config.js</code>, set <code>SHEET_ID</code> " +
      "to the id from your Google Sheet URL, make sure the sheet is shared as " +
      "“Anyone with the link → Viewer”, then refresh.",
      true
    );
    return;
  }

  setStatus("Loading…");
  el("table").hidden = true;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = parseGviz(await res.text());

    if (data.status === "error") {
      const reason = (data.errors && data.errors[0] && data.errors[0].detailed_message) || "Unknown error";
      throw new Error(reason);
    }

    columns = (data.table.cols || []).map((c, i) => ({
      label: (c.label && c.label.trim()) || `Column ${i + 1}`,
      type: c.type,
    }));
    rows = (data.table.rows || []).map((r) => (r.c || []).map(cellText));

    // Drop fully-empty trailing columns (common with Google Sheets)
    while (columns.length && rows.every((r) => !((r[columns.length - 1] || "").trim()))) {
      const last = columns.length - 1;
      if (columns[last].label.startsWith("Column ")) {
        columns.pop();
        rows.forEach((r) => r.pop());
      } else break;
    }

    sortCol = -1;
    render();
    const when = new Date().toLocaleTimeString();
    el("meta").textContent = `${rows.length} rows · updated ${when}`;
  } catch (err) {
    setStatus(
      `Could not load the sheet: <code>${escapeHtml(err.message)}</code>.<br>` +
      "Check that <code>SHEET_ID</code> is correct and the sheet is shared as " +
      "“Anyone with the link → Viewer”.",
      true
    );
    el("meta").textContent = "";
  }
}

function render() {
  const filter = el("search").value.trim().toLowerCase();

  let view = rows;
  if (filter) {
    view = rows.filter((r) => r.some((c) => c.toLowerCase().includes(filter)));
  }

  if (sortCol >= 0) {
    const numeric = columns[sortCol] && columns[sortCol].type === "number";
    view = view.slice().sort((a, b) => {
      let x = a[sortCol] || "", y = b[sortCol] || "";
      if (numeric) {
        x = parseFloat(x.replace(/[^0-9.\-]/g, "")) || 0;
        y = parseFloat(y.replace(/[^0-9.\-]/g, "")) || 0;
        return (x - y) * sortDir;
      }
      return x.localeCompare(y, undefined, { numeric: true }) * sortDir;
    });
  }

  // Header
  const thead = el("thead");
  thead.innerHTML = "";
  const tr = document.createElement("tr");
  columns.forEach((c, i) => {
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
    columns.forEach((_, i) => {
      const td = document.createElement("td");
      td.textContent = r[i] || "";
      row.appendChild(td);
    });
    frag.appendChild(row);
  });
  tbody.appendChild(frag);

  el("table").hidden = columns.length === 0;
  if (columns.length === 0) {
    setStatus("The sheet appears to be empty.", false);
  } else if (view.length === 0) {
    setStatus(filter ? "No rows match your filter." : "No data rows.", false);
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
