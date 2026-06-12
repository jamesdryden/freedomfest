/**
 * FreedomFest sign-up receiver.
 *
 * Receives POSTs from the website sign-up form and appends each
 * submission as a row to a "Website Sign-Ups" tab in the
 * FreedomFest spreadsheet (created automatically on first run).
 *
 * SETUP — see README.md in the website folder:
 *  1. Open the FreedomFest Google Sheet.
 *  2. Extensions → Apps Script, paste this whole file in, save.
 *  3. Deploy → New deployment → type "Web app".
 *     - Execute as: Me
 *     - Who has access: Anyone
 *  4. Copy the Web App URL into SHEET_ENDPOINT in js/main.js.
 */

var TAB_NAME = 'Website Sign-Ups';

var HEADERS = [
  'Timestamp',
  'Name',
  'Email',
  'Adults',
  'Children (names & ages)',
  'Dogs',
  'Accommodation preference',
  'Dietary requirements / allergies',
  'Extras interest',
  'Message',
];

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(TAB_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(TAB_NAME);
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([
      new Date(),
      data.name || '',
      data.email || '',
      data.adults || '',
      data.children || '',
      data.dogs || '',
      data.accommodation || '',
      data.dietary || '',
      data.extras || '',
      data.message || '',
    ]);

    return ContentService.createTextOutput(
      JSON.stringify({ result: 'success' })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ result: 'error', message: String(err) })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/** Optional: run this once from the editor to verify it works. */
function testAppend() {
  var fake = {
    postData: {
      contents: JSON.stringify({
        name: 'Test Person',
        email: 'test@example.com',
        adults: '2',
        children: 'Maya 4',
        dogs: '',
        accommodation: 'Private Luxury Bell Tent',
        dietary: 'Vegan',
        extras: 'Yoga, DJ Set',
        message: 'Hello from the test!',
      }),
    },
  };
  doPost(fake);
}
