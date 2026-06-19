"use strict";

const cfg = window.APP_CONFIG || {};
const $ = (s, r = document) => r.querySelector(s);

// ── Hero-Bild / -Video ───────────────────────────────────────
if (cfg.HERO_IMAGE) {
  $("#hero-bg").style.backgroundImage = `url("${cfg.HERO_IMAGE}")`;
  $(".hero").classList.add("has-photo");
}
if (cfg.HERO_VIDEO) {
  const v = $("#hero-video");
  v.src = cfg.HERO_VIDEO;
  if (cfg.HERO_IMAGE) v.poster = cfg.HERO_IMAGE;
  v.hidden = false;
  const p = v.play();
  if (p && p.catch) p.catch(() => {}); // Autoplay-Block ignorieren, Bild bleibt sichtbar
}

// ── Anmelde-Buttons mit dem Formular verbinden ───────────────
if (cfg.FORM_URL) {
  const formBtn = $("#cta-band-btn");
  if (formBtn) { formBtn.href = cfg.FORM_URL; formBtn.target = "_blank"; formBtn.rel = "noopener"; }
}

// ── Galerie mit Lightbox ─────────────────────────────────────
// Quelle: bevorzugt das öffentliche Google-Photos-Album (über /api/album),
// sonst die statische Liste cfg.GALLERY als Fallback. So aktualisiert sich die
// Galerie automatisch, sobald Fotos ins Album kommen.
(function () {
  const wrap = $("#gallery");
  if (!wrap) return;

  let box = null;
  function lightbox() {
    if (box) return box;
    box = document.createElement("div");
    box.className = "lightbox"; // versteckt per CSS, bis .open gesetzt wird
    box.innerHTML = '<img alt="Foto vom Unihockey-Turnier">';
    document.body.appendChild(box);
    const close = () => box.classList.remove("open");
    box.addEventListener("click", close);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    return box;
  }

  // Google-Photos-URLs vertragen Grössen-Suffixe (=w800); statische Pfade nicht.
  const sized = (src, suffix) =>
    src.includes("googleusercontent.com") ? src + suffix : src;

  function build(urls) {
    if (!Array.isArray(urls) || !urls.length) return false;
    const lb = lightbox();
    const frag = document.createDocumentFragment();
    urls.forEach((src) => {
      const img = document.createElement("img");
      img.src = sized(src, "=w800");
      img.alt = "Impression vom Unihockey-Turnier";
      img.loading = "lazy";
      img.addEventListener("click", () => {
        lb.firstElementChild.src = sized(src, "=w1600");
        lb.classList.add("open");
      });
      frag.appendChild(img);
    });
    wrap.appendChild(frag);
    $("#galerie-sec").hidden = false;
    return true;
  }

  async function fromAlbum() {
    if (!cfg.PHOTOS_ALBUM_API) return [];
    try {
      const r = await fetch(cfg.PHOTOS_ALBUM_API, { cache: "no-store" });
      if (!r.ok) return [];
      const d = await r.json();
      return Array.isArray(d.photos) ? d.photos : [];
    } catch (e) { return []; }
  }

  (async function () {
    if (build(await fromAlbum())) return;
    build(cfg.GALLERY); // Fallback: statische Galerie
  })();
})();

// ── gviz-Helper ──────────────────────────────────────────────
function buildUrl(sheetName, headerRows) {
  const id = (cfg.SHEET_ID || "").trim();
  if (!id) return null;
  let url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(id)}/gviz/tq?tqx=out:json`;
  if (sheetName && sheetName.trim()) url += `&sheet=${encodeURIComponent(sheetName.trim())}`;
  url += `&headers=${Number.isInteger(headerRows) ? headerRows : 1}`;
  return url;
}

function parseGviz(text) {
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a === -1 || b === -1) throw new Error("Unerwartete Antwort von Google.");
  return JSON.parse(text.slice(a, b + 1));
}

function cellText(c) {
  if (c == null) return "";
  if (c.f != null) return c.f;
  if (c.v == null) return "";
  return String(c.v);
}

function pickColumns(allCols, allow) {
  if (!Array.isArray(allow) || allow.length === 0) return allCols;
  const out = [];
  allow.forEach((w) => {
    const m = allCols.find((c) => c.label.toLowerCase() === w.toLowerCase());
    if (m) out.push(m);
  });
  return out;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ── Eine dynamische Sheet-Sektion ────────────────────────────
function SheetSection(opts) {
  const root = document.getElementById(opts.mount);
  if (!root) return;

  let columns = [], rows = [], sortCol = -1, sortDir = 1;

  // Markup aufbauen
  let searchEl = null;
  let bar = null;
  if (opts.filter) {
    bar = document.createElement("div");
    bar.className = "sheet-bar";
    searchEl = document.createElement("input");
    searchEl.type = "search";
    searchEl.className = "sheet-search";
    searchEl.placeholder = "filtern…";
    searchEl.autocomplete = "off";
    bar.appendChild(searchEl);
  }

  const status = document.createElement("div");
  status.className = "sheet-status";

  const tableWrap = document.createElement("div");
  tableWrap.className = "table-wrap";
  tableWrap.hidden = true;
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");
  table.append(thead, tbody);
  tableWrap.appendChild(table);

  const meta = document.createElement("div");
  meta.className = "sheet-meta";

  if (bar) root.append(bar);
  root.append(status, tableWrap, meta);

  const wrapSection = root.closest("section");
  const showSection = (v) => { if (wrapSection) wrapSection.style.display = v ? "" : "none"; };

  function setStatus(msg, kind) {
    status.className = "sheet-status" + (kind ? " " + kind : "");
    status.innerHTML = msg;
    status.hidden = !msg;
  }

  function render() {
    const filter = searchEl ? searchEl.value.trim().toLowerCase() : "";
    let view = rows.map((r) => columns.map((c) => r[c.idx] || ""));
    if (filter) view = view.filter((r) => r.some((c) => c.toLowerCase().includes(filter)));

    if (sortCol >= 0) {
      const numeric = columns[sortCol] && columns[sortCol].type === "number";
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

    // Kopf
    thead.innerHTML = "";
    const tr = document.createElement("tr");
    columns.forEach((c, i) => {
      const th = document.createElement("th");
      th.textContent = c.label;
      if (i === sortCol) {
        const ar = document.createElement("span");
        ar.className = "arrow";
        ar.textContent = sortDir === 1 ? "▲" : "▼";
        th.appendChild(ar);
      }
      th.addEventListener("click", () => {
        if (sortCol === i) sortDir = -sortDir; else { sortCol = i; sortDir = 1; }
        render();
      });
      tr.appendChild(th);
    });
    thead.appendChild(tr);

    // Körper
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

    const hasData = columns.length > 0 && view.length > 0;
    tableWrap.hidden = !hasData;
    if (bar) bar.style.display = hasData || filter ? "flex" : "none";

    if (columns.length === 0 || rows.length === 0) {
      setStatus(opts.empty || "Noch keine Daten.", "soft");
    } else if (view.length === 0) {
      setStatus("Kein Eintrag passt zum Filter.", "");
    } else {
      setStatus("", "");
    }
  }

  async function load() {
    const url = buildUrl(opts.sheetName, opts.headerRows);
    if (!url) { setStatus("Keine Datenquelle konfiguriert.", "error"); return 0; }

    if (bar) bar.style.display = "flex";
    setStatus("Lädt…", "");
    tableWrap.hidden = true;
    meta.textContent = "";

    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = parseGviz(await res.text());
      if (data.status === "error") {
        const reason = (data.errors && data.errors[0] && data.errors[0].detailed_message) || "Fehler";
        throw new Error(reason);
      }

      const allCols = (data.table.cols || []).map((c, i) => ({
        label: (c.label && c.label.trim()) || `Spalte ${i + 1}`,
        type: c.type, idx: i,
      }));

      // gviz liefert bei NICHT existierendem Tab das erste Tab (Formular-Antworten)
      // zurück. Solche Sektionen ausblenden, statt versehentlich PII (Name/Tel./
      // E-Mail) zu zeigen. Greift, bis das echte Tab (z.B. "Resultate") existiert.
      if (opts.guardFormFallback) {
        const low = allCols.map((c) => c.label.toLowerCase());
        const isFormTab = low.includes("zeitstempel") &&
          (low.includes("whatsapp telefonnummer") || low.includes("e-mail-adresse"));
        if (isFormTab) { showSection(false); return 0; }
      }

      columns = pickColumns(allCols, opts.columns);
      if (opts.labels) columns.forEach((c) => { if (opts.labels[c.label]) c.label = opts.labels[c.label]; });
      rows = (data.table.rows || []).map((r) => (r.c || []).map(cellText));
      sortCol = -1;

      // Abschnitt ausblenden, wenn leer und so konfiguriert (z.B. Resultate).
      if (opts.hideWhenEmpty && rows.length === 0) { showSection(false); return 0; }
      showSection(true);
      render();

      if (rows.length) {
        const t = new Date().toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" });
        meta.textContent = `${rows.length} Einträge · aktualisiert ${t}`;
      }
      return rows.length;
    } catch (err) {
      if (opts.hideWhenEmpty) { showSection(false); return 0; }
      // Fehlendes Tab o.ä. → freundliche Meldung statt Fehler.
      if (opts.soft) {
        setStatus(opts.empty || "Wird noch aufgeschaltet.", "soft");
      } else {
        setStatus(
          `Daten konnten nicht geladen werden: <code>${escapeHtml(err.message)}</code>.`,
          "error"
        );
      }
      return 0;
    }
  }

  if (searchEl) searchEl.addEventListener("input", render);
  return { load, opts };
}

// ── Spielplan & Tabelle aus dem "Ergebnisse"-Blatt ───────────
// Das "Ergebnisse"-Tab ist eine Turnier-Vorlage mit fixem Spalten-Layout, aber
// variabler Zeilenzahl (je nach Anzahl Teams/Spiele). Wir verankern uns deshalb
// an Markern statt an festen Zeilen:
//   • Spielplan  = jede Zeile mit Heim (Spalte E/idx4) UND Gast (Spalte G/idx6).
//                  Resultat steht in idx7 (Heim) ":" idx9 (Gast).
//   • Tabelle    = ab der Kopfzeile mit "SP","G","U","V" (idx13–16); Teamnamen in
//                  Spalte M/idx12, Werte rechts daneben, bis der Teamname leer ist.
function parseErgebnisse(rows) {
  const t = (r, i) => ((r[i] || "") + "").trim();
  const games = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const heim = t(r, 4), gast = t(r, 6);
    if (heim && gast) {
      const hs = t(r, 7), as = t(r, 9);
      games.push({
        nr: t(r, 1),
        zeit: t(r, 2),
        heim, gast,
        score: hs !== "" || as !== "" ? `${hs} : ${as}` : "–",
      });
    }
  }

  // Tabelle: erste zusammenhängende Gruppe von Zeilen mit Teamname in Spalte M
  // (idx12). Bewusst NICHT an der "SP/G/U/V"-Kopfzeile verankert: sobald Resultate
  // (Zahlen) erfasst sind, typisiert gviz diese Spalten als "number" und verwirft
  // die Text-Kopfzellen – die Kopfzeile verschwindet dann aus den Daten. Die
  // Teamnamen-Spalte bleibt dagegen stabil. Die "(Kopie)"-Blöcke weiter unten
  // werden ignoriert, weil wir nach der ersten Lücke (leere Zeile) abbrechen.
  const standings = [];
  let inBlock = false;
  for (let i = 0; i < rows.length; i++) {
    const team = t(rows[i], 12);
    if (team) {
      inBlock = true;
      const r = rows[i];
      const tf = t(r, 17), ta = t(r, 19);
      standings.push({
        team,
        sp: t(r, 13), g: t(r, 14), u: t(r, 15), v: t(r, 16),
        tore: tf !== "" || ta !== "" ? `${tf}:${ta}` : "–",
        diff: t(r, 20), pkt: t(r, 21),
      });
    } else if (inBlock) {
      break;
    }
  }
  return { games, standings };
}

function tableHtml(headers, rows) {
  let h = '<div class="table-wrap"><table><thead><tr>';
  headers.forEach((c) => { h += `<th>${escapeHtml(c)}</th>`; });
  h += "</tr></thead><tbody>";
  rows.forEach((cells) => {
    h += "<tr>";
    cells.forEach((c) => { h += `<td>${escapeHtml(c)}</td>`; });
    h += "</tr>";
  });
  return h + "</tbody></table></div>";
}

// Eigenständig gerendertes Final-Spiel (aus dem "Finalspiel"-Blatt). Wird unter
// dem Spielplan etwas abgesetzt dargestellt. Solange noch nicht alle Gruppenspiele
// gespielt sind (revealTeams=false), bleiben die Teamnamen verborgen ("?"); danach
// erscheinen sie, und der Sieger erhält ein 🏆.
function finalBlockHtml(f, revealTeams) {
  const zeit = f.zeit ? `<div class="final-time">🕒 ${escapeHtml(f.zeit)} Uhr</div>` : "";
  let match, note = "";

  if (revealTeams) {
    const num = (v) => { const n = parseFloat(String(v).replace(/[^0-9.\-]/g, "")); return isNaN(n) ? null : n; };
    const h = num(f.hs), a = num(f.as);
    let homeWin = false, awayWin = false;
    if (h !== null && a !== null && h !== a) { homeWin = h > a; awayWin = a > h; }
    const cup = ' <span class="final-cup" role="img" aria-label="Sieger">🏆</span>';
    match =
      `<span class="final-team${homeWin ? " winner" : ""}">${escapeHtml(f.heim)}${homeWin ? cup : ""}</span>` +
      `<span class="final-score">${escapeHtml(f.score)}</span>` +
      `<span class="final-team${awayWin ? " winner" : ""}">${escapeHtml(f.gast)}${awayWin ? cup : ""}</span>`;
  } else {
    const tbd = '<span class="final-team final-tbd">?</span>';
    match = tbd + '<span class="final-score">–</span>' + tbd;
    note = '<div class="final-note">Die Finalteams stehen fest, sobald alle Gruppenspiele gespielt sind.</div>';
  }

  return (
    '<div class="final-block">' +
      '<div class="final-label">🏆 Final</div>' +
      '<div class="final-match">' + match + "</div>" +
      note + zeit +
    "</div>"
  );
}

function renderSpielplan(games, final, revealTeams) {
  const mount = document.getElementById("spielplan");
  if (!mount) return;
  let html = games.length
    ? tableHtml(
        ["Nr", "Zeit", "Heim", "Gast", "Resultat"],
        games.map((g) => [g.nr, g.zeit, g.heim, g.gast, g.score])
      )
    : '<div class="sheet-status soft">Der Spielplan wird gerade erstellt.</div>';
  if (final) html += finalBlockHtml(final, revealTeams);
  mount.innerHTML = html;
}

function renderTabelle(standings) {
  const mount = document.getElementById("tabelle");
  if (!mount) return;
  if (!standings.length) {
    mount.innerHTML = '<div class="sheet-status soft">Die Tabelle erscheint, sobald Resultate erfasst sind.</div>';
    return;
  }
  const num = (v) => { const n = parseFloat(String(v).replace(/[^0-9.\-]/g, "")); return isNaN(n) ? 0 : n; };
  const sorted = standings.slice().sort((a, b) => num(b.pkt) - num(a.pkt) || num(b.diff) - num(a.diff));
  mount.innerHTML = tableHtml(
    ["#", "Team", "SP", "G", "U", "V", "Tore", "Diff", "Pkt"],
    sorted.map((r, i) => [String(i + 1), r.team, r.sp, r.g, r.u, r.v, r.tore, r.diff, r.pkt])
  );
}

// Vorschau-Modus: mit "?preview" (oder "?vorschau") in der URL werden Spielplan
// und Tabelle eingeblendet, auch wenn sie für normale Besucher noch aus sind.
// So kannst du alles testen, ohne die Config zu ändern oder zu deployen.
function previewMode() {
  try {
    const p = new URLSearchParams(location.search);
    return p.has("preview") || p.has("vorschau");
  } catch (e) { return false; }
}

// Holt die Zeilen eines Tabs als Array von Text-Arrays (oder null bei Fehler).
async function fetchSheetRows(sheetName) {
  const url = buildUrl(sheetName, 1);
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = parseGviz(await res.text());
    if (data.status === "error") throw new Error("gviz error");
    return (data.table.rows || []).map((r) => (r.c || []).map(cellText));
  } catch (err) {
    return null;
  }
}

// "Finalspiel"-Blatt: eigenes, einfacheres Layout als "Ergebnisse".
//   Zeit=idx0, Nr=idx1, Heim=idx2, "-"=idx3, Gast=idx4, Heim-Tore=idx5,
//   " : "=idx6, Gast-Tore=idx7. Liefert das erste echte Spiel (mit Heim+Gast).
function parseFinal(rows) {
  if (!rows) return null;
  for (const r of rows) {
    const t = (i) => ((r[i] || "") + "").trim();
    const heim = t(2), gast = t(4);
    if (!heim || !gast || heim.toLowerCase() === "spielpaarung") continue;
    const hs = t(5), as = t(7);
    return {
      zeit: t(0), nr: t(1), heim, gast, hs, as,
      score: hs !== "" || as !== "" ? `${hs} : ${as}` : "–",
    };
  }
  return null;
}

async function loadResults(rc) {
  if (!rc) return;
  const preview = previewMode();

  const rows = await fetchSheetRows(rc.sheetName || "Ergebnisse");
  if (!rows) return; // bei Fehlern bleiben die Abschnitte einfach ausgeblendet
  const { games, standings } = parseErgebnisse(rows);

  const anyPlayed = games.some((g) => g.score !== "–");           // mind. 1 Resultat
  const allPlayed = games.length > 0 && games.every((g) => g.score !== "–");

  const showSpielplan = rc.showSpielplan || preview;
  // Die Tabelle (ganze Sektion) erscheint erst, sobald das erste Resultat erfasst
  // ist – vorher bleibt sie komplett ausgeblendet (kein leerer Platzhalter). Die
  // Vorlage listet die Teams zwar immer auf, darum zusätzlich an anyPlayed koppeln.
  const showTabelle = anyPlayed && standings.length > 0;
  if (!showSpielplan && !showTabelle) return;

  // Im Vorschau-Modus einen Hinweis einblenden, der für Besucher nicht da ist.
  // Nur beim Spielplan sinnvoll – die Tabelle ist bei Resultaten für alle sichtbar.
  const previewNote = preview
    ? '<div class="preview-note">🔍 Vorschau – für Besucher noch ausgeblendet</div>'
    : "";
  if (showSpielplan) {
    // Final immer zeigen; Teamnamen aber erst, wenn alle Gruppenspiele gespielt sind.
    const final = parseFinal(await fetchSheetRows(rc.finalSheetName || "Finalspiel"));
    renderSpielplan(games, final, allPlayed);
    const sec = document.getElementById("spielplan-sec");
    if (sec) { sec.style.display = ""; if (previewNote) sec.insertAdjacentHTML("afterbegin", previewNote); }
  }
  if (showTabelle) {
    renderTabelle(standings);
    const sec = document.getElementById("tabelle-sec");
    if (sec) sec.style.display = "";
  }
}

// ── Sektionen orchestrieren ──────────────────────────────────
(async function () {
  const sections = cfg.SECTIONS || [];
  const inst = {};
  sections.forEach((s) => { inst[s.mount] = SheetSection(s); });

  // Angemeldete Teams (und allfällige weitere generische Sektionen).
  for (const s of sections) {
    if (inst[s.mount]) await inst[s.mount].load();
  }

  // Spielplan & Tabelle aus dem "Ergebnisse"-Blatt (eigene Darstellung).
  await loadResults(cfg.RESULTS);
})();
