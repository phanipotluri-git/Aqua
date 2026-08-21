// ─── Aqua Analytics — Google Apps Script Web App ─────────────────────────────
//
// HOW TO DEPLOY:
//  1. Open your Google Sheet
//  2. Click Extensions → Apps Script
//  3. Delete any existing code, paste this entire file
//  4. Click Save (💾), then Deploy → Manage deployments → Edit → New version → Deploy
// ─────────────────────────────────────────────────────────────────────────────

var SPREADSHEET_ID = '1jbyn7Fka8EbXudEG9qe9YHBqAkP3Bx45TMcL_4uUjfE';

// Expected tab names — matched case-insensitively
var SHEETS = {
  'Field Reports': 'fieldReports',
  'Staff':         'staff',
  'Customer':      'customers',
  'Statements':    'statements'
};

function doGet() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet()
          || SpreadsheetApp.openById(SPREADSHEET_ID);
    var tz = Session.getScriptTimeZone();
    var result = {};

    // Build a case-insensitive map of actual sheet names
    var allSheets = ss.getSheets();
    var sheetMap = {};
    allSheets.forEach(function(s) {
      sheetMap[s.getName().toLowerCase().trim()] = s;
    });

    // Include actual tab names in response for debugging
    result._sheets = allSheets.map(function(s) { return s.getName(); });

    Object.keys(SHEETS).forEach(function(sheetName) {
      var key = SHEETS[sheetName];
      // Try exact match first, then case-insensitive
      var sheet = ss.getSheetByName(sheetName)
               || sheetMap[sheetName.toLowerCase().trim()];
      if (!sheet) { result[key] = []; return; }

      var values = sheet.getDataRange().getValues();
      if (values.length < 2) { result[key] = []; return; }

      var headers = values[0].map(function(h) { return String(h).trim(); });

      result[key] = values.slice(1).map(function(row) {
        var obj = {};
        headers.forEach(function(h, i) {
          var v = row[i];
          if (v instanceof Date) {
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
