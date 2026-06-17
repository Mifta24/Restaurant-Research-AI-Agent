const SHEET_NAME = 'Lead List';
const EXPECTED_COLUMNS = 27;
const DEFAULT_SPREADSHEET_ID = '1rwV6Q83zwZeWzxekFo3Qu9B3qC8hi5I6kEz7nEtim8s';

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

    if (newLeads.length === 0) {
      return jsonResponse({ ok: true, inserted: 0, duplicatesSkipped });
    }

    const startRow = findFirstEmptyLeadRow(sheet);
    const rows = newLeads.map((lead, index) => mapLeadToRow(lead, startRow + index));
    sheet.getRange(startRow, 1, rows.length, EXPECTED_COLUMNS).setValues(rows);

    return jsonResponse({
      ok: true,
      inserted: rows.length,
      duplicatesSkipped,
      startRow,
    });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error) }, 500);
  }
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

function jsonResponse(body, statusCode) {
  const output = ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}
