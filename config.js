// ─────────────────────────────────────────────────────────────────────────────
//  KONFIGURATION  –  hier stellst du die dynamischen Teile der Seite ein.
//  Der feste Text (Regeln, Infos …) steht direkt in index.html.
// ─────────────────────────────────────────────────────────────────────────────

window.APP_CONFIG = {
  // Google-Sheet, das als Datenquelle dient (muss "Jeder mit Link → Betrachter" sein).
  SHEET_ID: "1WNip6EDSLhSV8UFcmnRud8p09_0BOfIip5z6IeTSzT8",

  // Anmelde-Formular (der grosse "Team anmelden"-Button).
  FORM_URL: "https://forms.gle/yTx61tECJizBjyPT7",

  // Hero-Hintergrund: optionales Video (stummer Loop) mit Bild als Fallback/Poster.
  // Leer lassen = nur Farbverlauf.
  HERO_IMAGE: "images/hero.jpg",
  HERO_VIDEO: "images/hero-loop.mp4", // stummer 720p-Loop, Bild dient als Poster/Fallback

  // Foto-Galerie unten auf der Seite.
  GALLERY: [
    "images/g1.jpg",
    "images/g2.jpg",
    "images/g3.jpg",
    "images/g4.jpg",
    "images/g5.jpg",
    "images/g6.jpg",
  ],

  // ── Datentabellen aus dem Google-Sheet ──────────────────────────────────────
  // Jede Sektion zeigt ein Tabellenblatt (Tab) des Sheets an.
  // mount      = id des Containers in index.html
  // sheetName  = Name des Tabs ("" = erstes Tab)
  // columns    = nur diese Spalten anzeigen ([] = alle). PII-Schutz!
  // filter     = Suchfeld anzeigen
  // soft       = wenn das Tab (noch) nicht existiert, freundliche Meldung statt Fehler
  SECTIONS: [
    {
      mount: "spielplan",
      sheetName: "Spielplan",
      headerRows: 1,
      columns: [],
      filter: false,
      soft: true,
      empty: "Der Spielplan wird kurz vor dem Turnier hier aufgeschaltet – sobald alle Anmeldungen da sind und die Gruppen feststehen.",
    },
    {
      mount: "teams",
      sheetName: "", // Tab mit den Formular-Antworten
      headerRows: 1,
      columns: ["Teamname", "Ort"], // ⚠ keine Namen/Tel./E-Mail öffentlich zeigen
      filter: true,
      soft: true,
      empty: "Noch keine Anmeldungen – sei das erste Team! 🏑",
    },
    {
      mount: "resultate",
      sheetName: "Resultate",
      headerRows: 1,
      columns: [],
      filter: false,
      soft: true,
      empty: "Sobald gespielt wird, erscheinen hier die Resultate und die Rangliste – live.",
    },
  ],
};
