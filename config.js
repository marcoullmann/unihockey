// ─────────────────────────────────────────────────────────────────────────────
// EDIT THIS FILE to point the page at your Google Sheet.
//
// 1. Open your Google Sheet.
// 2. Share it: "Anyone with the link" -> "Viewer"  (required, no API key needed).
// 3. Copy the SHEET_ID from the URL:
//    https://docs.google.com/spreadsheets/d/<<< THIS PART >>>/edit#gid=0
// 4. Put the tab (sheet) name in SHEET_NAME, or leave "" to use the first tab.
// ─────────────────────────────────────────────────────────────────────────────

window.APP_CONFIG = {
  // The long id from your sheet URL (between /d/ and /edit):
  SHEET_ID: "",

  // Name of the tab to show, e.g. "Tabelle1" / "Sheet1". Empty = first tab.
  SHEET_NAME: "",

  // Shown in the header.
  TITLE: "Unihockey",
  SUBTITLE: "Live data from Google Sheets",
};
