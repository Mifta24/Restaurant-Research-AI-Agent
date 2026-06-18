const SHEET_NAME = 'Lead List';
const DIAGNOSIS_SHEET_NAME = 'Diagnosa Report';
const EXPECTED_COLUMNS = 27;
const DIAGNOSIS_EXPECTED_COLUMNS = 9;
const DEFAULT_SPREADSHEET_ID = '1rwV6Q83zwZeWzxekFo3Qu9B3qC8hi5I6kEz7nEtim8s';
const DIAGNOSIS_HEADERS = [
  'No',
  'Created At',
  'Lead ID',
  'Restaurant Name',
  'Current Situation',
  'Main Problem',
  'Improvement Suggestion',
  'Recommended FTS Service',
  'Priority',
];

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    const scriptSecret = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');

    if (scriptSecret && payload.secret !== scriptSecret) {
      return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);
    }

    const leads = Array.isArray(payload.leads) ? payload.leads : [payload.lead];
    const cleanLeads = leads.filter(Boolean);

    if (cleanLeads.length === 0) {
      return jsonResponse({ ok: false, error: 'No leads received' }, 400);
    }

    const sheet = getTargetSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) {
      return jsonResponse({ ok: false, error: `Sheet not found: ${SHEET_NAME}` }, 404);
    }

    const existingLeadIds = getExistingLeadIds(sheet);
    const newLeads = cleanLeads.filter(
      (lead) => !lead.leadId || !existingLeadIds.has(String(lead.leadId)),
    );
    const duplicatesSkipped = cleanLeads.length - newLeads.length;
    const diagnosisRowsWritten = writeDiagnosisReports(cleanLeads);

    if (newLeads.length === 0) {
      return jsonResponse({
        ok: true,
        inserted: 0,
        duplicatesSkipped,
        diagnosisRowsWritten,
      });
    }

    const startRow = findFirstEmptyLeadRow(sheet);
    const rows = newLeads.map((lead, index) => mapLeadToRow(lead, startRow + index));
    sheet.getRange(startRow, 1, rows.length, EXPECTED_COLUMNS).setValues(rows);

    return jsonResponse({
      ok: true,
      inserted: rows.length,
      duplicatesSkipped,
      diagnosisRowsWritten,
      startRow,
    });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error) }, 500);
  }
}

function writeDiagnosisReports(leads) {
  const diagnosisLeads = leads.filter((lead) => lead.diagnosis || lead.diagnosisReport);
  if (diagnosisLeads.length === 0) return 0;

  const sheet = getOrCreateDiagnosisSheet();
  const existingLeadRows = getExistingDiagnosisLeadRows(sheet);
  let rowsWritten = 0;
  const newDiagnosisLeads = [];

  diagnosisLeads.forEach((lead) => {
    const existingRow = lead.leadId ? existingLeadRows[String(lead.leadId)] : null;
    if (!existingRow) {
      newDiagnosisLeads.push(lead);
      return;
    }

    sheet.getRange(existingRow, 1, 1, DIAGNOSIS_EXPECTED_COLUMNS).setValues([
      mapDiagnosisToRow(lead, existingRow),
    ]);
    rowsWritten += 1;
  });

  if (newDiagnosisLeads.length > 0) {
    const startRow = findFirstEmptyDiagnosisRow(sheet);
    const rows = newDiagnosisLeads.map((lead, index) => mapDiagnosisToRow(lead, startRow + index));
    sheet.getRange(startRow, 1, rows.length, DIAGNOSIS_EXPECTED_COLUMNS).setValues(rows);
    rowsWritten += rows.length;
  }

  applyDiagnosisSheetDesign(sheet);

  return rowsWritten;
}

function getOrCreateDiagnosisSheet() {
  const spreadsheet = getTargetSpreadsheet();
  let sheet = spreadsheet.getSheetByName(DIAGNOSIS_SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(DIAGNOSIS_SHEET_NAME);
  }

  const firstRow = sheet.getRange(1, 1, 1, DIAGNOSIS_EXPECTED_COLUMNS).getValues()[0];
  const hasHeader = firstRow.some((value) => Boolean(value));

  if (!hasHeader) {
    sheet.getRange(1, 1, 1, DIAGNOSIS_EXPECTED_COLUMNS).setValues([DIAGNOSIS_HEADERS]);
  }

  applyDiagnosisSheetDesign(sheet);

  return sheet;
}

function applyDiagnosisSheetDesign(sheet) {
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, DIAGNOSIS_EXPECTED_COLUMNS).setValues([DIAGNOSIS_HEADERS]);

  const headerRange = sheet.getRange(1, 1, 1, DIAGNOSIS_EXPECTED_COLUMNS);
  headerRange
    .setBackground('#183B56')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);

  sheet.setRowHeight(1, 42);
  sheet.setColumnWidth(1, 48);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 180);
  sheet.setColumnWidth(4, 220);
  sheet.setColumnWidth(5, 360);
  sheet.setColumnWidth(6, 320);
  sheet.setColumnWidth(7, 380);
  sheet.setColumnWidth(8, 170);
  sheet.setColumnWidth(9, 120);

  const lastRow = Math.max(sheet.getLastRow(), 2);
  const bodyRange = sheet.getRange(2, 1, lastRow - 1, DIAGNOSIS_EXPECTED_COLUMNS);
  bodyRange
    .setWrap(true)
    .setVerticalAlignment('top')
    .setHorizontalAlignment('left');

  sheet.getRange(2, 1, lastRow - 1, 1).setHorizontalAlignment('center');
  sheet.getRange(2, 8, lastRow - 1, 2).setHorizontalAlignment('center');

  if (lastRow > 1) {
    sheet.autoResizeRows(2, lastRow - 1);
  }
}

function getExistingDiagnosisLeadRows(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return {};

  const leadIdValues = sheet.getRange(2, 3, lastRow - 1, 1).getValues();
  const rowsByLeadId = {};
  leadIdValues.forEach((row, index) => {
    if (row[0]) rowsByLeadId[String(row[0])] = index + 2;
  });
  return rowsByLeadId;
}

function findFirstEmptyDiagnosisRow(sheet) {
  const lastRow = Math.max(sheet.getLastRow(), 2);
  const rowCount = lastRow - 1;
  const leadIdAndNameValues = sheet.getRange(2, 3, rowCount, 2).getValues();

  for (let index = 0; index < leadIdAndNameValues.length; index += 1) {
    const leadId = leadIdAndNameValues[index][0];
    const restaurantName = leadIdAndNameValues[index][1];
    if (!leadId && !restaurantName) {
      return index + 2;
    }
  }

  return lastRow + 1;
}

function getExistingLeadIds(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return new Set();

  const leadIdValues = sheet.getRange(2, 3, lastRow - 1, 1).getValues();
  const ids = new Set();
  leadIdValues.forEach((row) => {
    if (row[0]) ids.add(String(row[0]));
  });
  return ids;
}

function findFirstEmptyLeadRow(sheet) {
  const lastRow = Math.max(sheet.getLastRow(), 2);
  const rowCount = lastRow - 1;
  const leadIdAndNameValues = sheet.getRange(2, 3, rowCount, 2).getValues();

  for (let index = 0; index < leadIdAndNameValues.length; index += 1) {
    const leadId = leadIdAndNameValues[index][0];
    const restaurantName = leadIdAndNameValues[index][1];
    if (!leadId && !restaurantName) {
      return index + 2;
    }
  }

  return lastRow + 1;
}

function getTargetSpreadsheet() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || DEFAULT_SPREADSHEET_ID;

  return SpreadsheetApp.openById(spreadsheetId);
}

function mapLeadToRow(lead, rowNumber) {
  return [
    rowNumber - 1,
    lead.createdAt || new Date().toISOString(),
    lead.leadId || '',
    lead.restaurantName || '',
    lead.jakartaArea || '',
    lead.category || '',
    lead.latitude || '',
    lead.longitude || '',
    lead.phoneWhatsapp || '',
    lead.websiteStatus || 'Need Check',
    lead.websiteUrl || '',
    lead.instagram || 'Need Check',
    lead.source || 'OpenStreetMap',
    lead.locationClear || 'No',
    Number(lead.salesOpportunityScore || 0),
    lead.priority || 'Not Qualified',
    lead.manualCheck || 'No',
    lead.manualCheckNotes || '',
    lead.aiSalesNotes || '',
    lead.recommendedService || 'Restaurant Digital Starter Package',
    lead.outreachMessage || '',
    lead.outreachStatus || 'Not Contacted',
    lead.leadStatus || 'New',
    lead.lastContactDate || '',
    lead.nextFollowUpDate || '',
    lead.replyNotes || '',
    lead.sourceUrl || '',
  ];
}

function mapDiagnosisToRow(lead, rowNumber) {
  const diagnosis = lead.diagnosis || parseDiagnosisReport(lead.diagnosisReport || '');

  return [
    rowNumber - 1,
    lead.createdAt || new Date().toISOString(),
    lead.leadId || '',
    diagnosis.restaurantName || lead.restaurantName || '',
    diagnosis.currentSituation || '',
    diagnosis.mainProblem || '',
    diagnosis.improvementSuggestion || '',
    diagnosis.recommendedFtsService || lead.recommendedService || '',
    diagnosis.priority || lead.priority || '',
  ];
}

function parseDiagnosisReport(report) {
  const diagnosis = {};
  String(report || '').split('\n').forEach((line) => {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) return;

    const key = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();

    if (key === 'restaurant name') diagnosis.restaurantName = value;
    if (key === 'current situation') diagnosis.currentSituation = value;
    if (key === 'main problem') diagnosis.mainProblem = value;
    if (key === 'improvement suggestion') diagnosis.improvementSuggestion = value;
    if (key === 'recommended fts service') diagnosis.recommendedFtsService = value;
    if (key === 'priority') diagnosis.priority = value;
  });
  return diagnosis;
}

function jsonResponse(body, statusCode) {
  const output = ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}
