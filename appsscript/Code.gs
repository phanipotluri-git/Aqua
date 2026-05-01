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

var SHEET_NAME = 'Field Reports'; // exact tab name in the Google Sheet

function doGet() {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('Sheet "' + SHEET_NAME + '" not found');

    var values = sheet.getDataRange().getValues();
    if (values.length < 2) return respond([]);

    var headers = values[0].map(function(h) { return String(h).trim(); });
    var tz = Session.getScriptTimeZone(); // use the script's configured timezone (IST)

    var records = values.slice(1).map(function(row) {
      var obj = {};
      headers.forEach(function(h, i) {
        var v = row[i];
        if (v instanceof Date) {
          // TIME-only cells use the 1899-12-30 epoch in Apps Script.
          // Output them as plain "HH:mm:ss" text so the dashboard can parse
          // them simply without any epoch/timezone confusion.
          if (v.getFullYear() <= 1899) {
            obj[h] = Utilities.formatDate(v, tz, 'HH:mm:ss');
          } else {
            // Full date/datetime cells — keep as ISO string (UTC)
            obj[h] = v.toISOString();
          }
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
