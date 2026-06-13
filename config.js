// ─────────────────────────────────────────────────────────────────────────────
// EDIT THIS FILE to control what the page shows.
//
// SHEET_ID    – the long id from your sheet URL (between /d/ and /edit).
// SHEET_NAME  – tab name, or "" for the first tab.
// HEADER_ROWS – number of header rows in the sheet (1 for a normal sheet).
// COLUMNS     – allowlist of column headers to display, in this order.
//               Leave [] to show ALL columns.
//
//   ⚠ PRIVACY: this site is PUBLIC and gets indexed by search engines.
//   This sheet is a form-response sheet that collects personal data
//   (names, WhatsApp numbers, e-mail addresses). COLUMNS is therefore
//   restricted to the non-sensitive fields. Do NOT add "Name",
//   "WhatsApp Telefonnummer" or "E-Mail-Adresse" unless you truly intend
//   to publish those people's contact details to the open internet.
// ─────────────────────────────────────────────────────────────────────────────

window.APP_CONFIG = {
  SHEET_ID: "1WNip6EDSLhSV8UFcmnRud8p09_0BOfIip5z6IeTSzT8",
  SHEET_NAME: "",
  HEADER_ROWS: 1,

  // Public, non-sensitive columns only. Add more headers here to show them.
  COLUMNS: ["Teamname", "Ort"],

  // The Google Form people register through (the "Register" button).
  FORM_URL: "https://forms.gle/yTx61tECJizBjyPT7",
  CTA_LABEL: "Team anmelden",

  TITLE: "Unihockey-Turnier",
  SUBTITLE: "Melde dein Team für das Turnier an – und sieh, wer schon dabei ist.",
  TABLE_TITLE: "Angemeldete Teams",
};
