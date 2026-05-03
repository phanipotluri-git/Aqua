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

// Maps sheet tab names → JSON response keys
var SHEETS = {
  'Field Reports': 'fieldReports',
  'Staff':         'staff',
  'Customer':      'customers',
  'Statements':    'statements'
};

function doGet() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var tz = Session.getScriptTimeZone();
    var result = {};

    Object.keys(SHEETS).forEach(function(sheetName) {
      var key = SHEETS[sheetName];
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) { result[key] = []; return; }

      var values = sheet.getDataRange().getValues();
      if (values.length < 2) { result[key] = []; return; }

      var headers = values[0].map(function(h) { return String(h).trim(); });

      result[key] = values.slice(1).map(function(row) {
        var obj = {};
        headers.forEach(function(h, i) {
          var v = row[i];
          if (v instanceof Date) {
            // TIME-only cells use the 1899-12-30 epoch in Apps Script.
            if (v.getFullYear() <= 1899) {
              obj[h] = Utilities.formatDate(v, tz, 'HH:mm:ss');
            } else {
              obj[h] = v.toISOString();
            }
          } else {
            obj[h] = (v === null || v === undefined) ? '' : String(v).trim();
          }
        });
        return obj;
      });
    });

    return respond(result);
  } catch (e) {
    return respond({ error: e.message });
  }
}

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
