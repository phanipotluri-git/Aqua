// ─── Aqua Analytics — Google Apps Script Web App ─────────────────────────────
//
// HOW TO DEPLOY:
//  1. Open your Google Sheet
//  2. Click Extensions → Apps Script
//  3. Delete any existing code, paste this entire file
//  4. Click Save (💾), then Deploy → New deployment
//  5. Type: Web app
//  6. Execute as:        Me
//  7. Who has access:    Anyone
//  8. Click Deploy → copy the Web App URL
//  9. Paste that URL into analytics.html  →  var APPS_SCRIPT_URL = '...'
// ─────────────────────────────────────────────────────────────────────────────

var SHEET_NAME = 'Field Visit'; // exact tab name in the Google Sheet

function doGet() {
  try {
    var sheet  = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('Sheet "' + SHEET_NAME + '" not found');

    var values = sheet.getDataRange().getValues();
    if (values.length < 2) return respond([]);

    var headers = values[0].map(function(h) { return String(h).trim(); });

    var records = values.slice(1).map(function(row) {
      var obj = {};
      headers.forEach(function(h, i) {
        var v = row[i];
        // Apps Script returns Date objects for date cells — convert to ISO string
        if (v instanceof Date) {
          obj[h] = v.toISOString();
        } else {
          obj[h] = (v === null || v === undefined) ? '' : String(v).trim();
        }
      });
      return obj;
    });

    return respond(records);
  } catch (e) {
    return respond({ error: e.message });
  }
}

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
