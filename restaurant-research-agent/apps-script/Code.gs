const SHEET_NAME = 'Lead List';
const LEAD_RESEARCH_SHEET_NAME = 'AI Lead Research';
const DIAGNOSIS_SHEET_NAME = 'Diagnosa Report';
const SALES_MESSAGE_SHEET_NAME = 'Sales Messages';
const FOLLOW_UP_SHEET_NAME = 'Follow Up Actions';
const EXPECTED_COLUMNS = 27;
const LEAD_RESEARCH_EXPECTED_COLUMNS = 15;
const DIAGNOSIS_EXPECTED_COLUMNS = 9;
const SALES_MESSAGE_EXPECTED_COLUMNS = 15;
const FOLLOW_UP_EXPECTED_COLUMNS = 12;
const DEFAULT_SPREADSHEET_ID = '1rwV6Q83zwZeWzxekFo3Qu9B3qC8hi5I6kEz7nEtim8s';
const LEAD_RESEARCH_HEADERS = [
  'No',
  'Created At',
  'Lead ID',
  'Restaurant Name',
  'Search Query',
  'Search Summary',
  'Website Finding',
  'SNS Finding',
  'WhatsApp Finding',
  'Menu/Reservation Finding',
  'Opportunity Signals',
  'Risk Level',
  'Recommended Next Step',
  'Confidence',
  'Evidence Links',
];
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
const SALES_MESSAGE_HEADERS = [
  'No',
  'Created At',
  'Lead ID',
  'Restaurant Name',
  'Recommended FTS Service',
  'Personalization Signal',
  'Outreach Angle',
  'WhatsApp ID',
  'Instagram DM ID',
  'Email Subject ID',
  'Email Body ID',
  'WhatsApp EN',
  'Instagram DM EN',
  'Email Subject EN',
  'Email Body EN',
];
const FOLLOW_UP_HEADERS = [
  'No',
  'Created At',
  'Lead ID',
  'Restaurant Name',
  'Reply Received At',
  'Reply Text',
  'Classification',
  'Recommended Action',
  'Next Message',
  'Reminder Date',
  'Confidence',
  'Reason',
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
    const leadResearchRowsWritten = writeLeadResearch(cleanLeads);
    const diagnosisRowsWritten = writeDiagnosisReports(cleanLeads);
    const salesMessageRowsWritten = writeSalesMessages(cleanLeads);
    const followUpRowsWritten = writeFollowUps(cleanLeads);

    if (newLeads.length === 0) {
      return jsonResponse({
        ok: true,
        inserted: 0,
        duplicatesSkipped,
        leadResearchRowsWritten,
        diagnosisRowsWritten,
        salesMessageRowsWritten,
        followUpRowsWritten,
      });
    }

    const startRow = findFirstEmptyLeadRow(sheet);
    const rows = newLeads.map((lead, index) => mapLeadToRow(lead, startRow + index));
    sheet.getRange(startRow, 1, rows.length, EXPECTED_COLUMNS).setValues(rows);

    return jsonResponse({
      ok: true,
      inserted: rows.length,
      duplicatesSkipped,
      leadResearchRowsWritten,
      diagnosisRowsWritten,
      salesMessageRowsWritten,
      followUpRowsWritten,
      startRow,
    });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error) }, 500);
  }
}

function writeLeadResearch(leads) {
  const researchLeads = leads.filter((lead) => lead.leadResearch || lead.leadResearchReport);
  if (researchLeads.length === 0) return 0;

  const sheet = getOrCreateLeadResearchSheet();
  const existingLeadRows = getExistingLeadResearchLeadRows(sheet);
  let rowsWritten = 0;
  const newResearchLeads = [];

  researchLeads.forEach((lead) => {
    const existingRow = lead.leadId ? existingLeadRows[String(lead.leadId)] : null;
    if (!existingRow) {
      newResearchLeads.push(lead);
      return;
    }

    sheet.getRange(existingRow, 1, 1, LEAD_RESEARCH_EXPECTED_COLUMNS).setValues([
      mapLeadResearchToRow(lead, existingRow),
    ]);
    rowsWritten += 1;
  });

  if (newResearchLeads.length > 0) {
    const startRow = findFirstEmptyLeadResearchRow(sheet);
    const rows = newResearchLeads.map((lead, index) => mapLeadResearchToRow(lead, startRow + index));
    sheet.getRange(startRow, 1, rows.length, LEAD_RESEARCH_EXPECTED_COLUMNS).setValues(rows);
    rowsWritten += rows.length;
  }

  applyLeadResearchSheetDesign(sheet);

  return rowsWritten;
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

function writeSalesMessages(leads) {
  const messageLeads = leads.filter((lead) => lead.salesMessages || lead.salesMessageReport);
  if (messageLeads.length === 0) return 0;

  const sheet = getOrCreateSalesMessageSheet();
  const existingLeadRows = getExistingSalesMessageLeadRows(sheet);
  let rowsWritten = 0;
  const newMessageLeads = [];

  messageLeads.forEach((lead) => {
    const existingRow = lead.leadId ? existingLeadRows[String(lead.leadId)] : null;
    if (!existingRow) {
      newMessageLeads.push(lead);
      return;
    }

    sheet.getRange(existingRow, 1, 1, SALES_MESSAGE_EXPECTED_COLUMNS).setValues([
      mapSalesMessageToRow(lead, existingRow),
    ]);
    rowsWritten += 1;
  });

  if (newMessageLeads.length > 0) {
    const startRow = findFirstEmptySalesMessageRow(sheet);
    const rows = newMessageLeads.map((lead, index) => mapSalesMessageToRow(lead, startRow + index));
    sheet.getRange(startRow, 1, rows.length, SALES_MESSAGE_EXPECTED_COLUMNS).setValues(rows);
    rowsWritten += rows.length;
  }

  applySalesMessageSheetDesign(sheet);

  return rowsWritten;
}

function writeFollowUps(leads) {
  const followUpLeads = leads.filter((lead) => lead.followUp || lead.followUpReport);
  if (followUpLeads.length === 0) return 0;

  const sheet = getOrCreateFollowUpSheet();
  const existingLeadRows = getExistingFollowUpLeadRows(sheet);
  let rowsWritten = 0;
  const newFollowUpLeads = [];

  followUpLeads.forEach((lead) => {
    const existingRow = lead.leadId ? existingLeadRows[String(lead.leadId)] : null;
    if (!existingRow) {
      newFollowUpLeads.push(lead);
      return;
    }

    sheet.getRange(existingRow, 1, 1, FOLLOW_UP_EXPECTED_COLUMNS).setValues([
      mapFollowUpToRow(lead, existingRow),
    ]);
    rowsWritten += 1;
  });

  if (newFollowUpLeads.length > 0) {
    const startRow = findFirstEmptyFollowUpRow(sheet);
    const rows = newFollowUpLeads.map((lead, index) => mapFollowUpToRow(lead, startRow + index));
    sheet.getRange(startRow, 1, rows.length, FOLLOW_UP_EXPECTED_COLUMNS).setValues(rows);
    rowsWritten += rows.length;
  }

  applyFollowUpSheetDesign(sheet);

  return rowsWritten;
}

function getOrCreateLeadResearchSheet() {
  const spreadsheet = getTargetSpreadsheet();
  let sheet = spreadsheet.getSheetByName(LEAD_RESEARCH_SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(LEAD_RESEARCH_SHEET_NAME);
  }

  const firstRow = sheet.getRange(1, 1, 1, LEAD_RESEARCH_EXPECTED_COLUMNS).getValues()[0];
  const hasHeader = firstRow.some((value) => Boolean(value));

  if (!hasHeader) {
    sheet.getRange(1, 1, 1, LEAD_RESEARCH_EXPECTED_COLUMNS).setValues([LEAD_RESEARCH_HEADERS]);
  }

  applyLeadResearchSheetDesign(sheet);

  return sheet;
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

function getOrCreateSalesMessageSheet() {
  const spreadsheet = getTargetSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SALES_MESSAGE_SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SALES_MESSAGE_SHEET_NAME);
  }

  const firstRow = sheet.getRange(1, 1, 1, SALES_MESSAGE_EXPECTED_COLUMNS).getValues()[0];
  const hasHeader = firstRow.some((value) => Boolean(value));

  if (!hasHeader) {
    sheet.getRange(1, 1, 1, SALES_MESSAGE_EXPECTED_COLUMNS).setValues([SALES_MESSAGE_HEADERS]);
  }

  applySalesMessageSheetDesign(sheet);

  return sheet;
}

function getOrCreateFollowUpSheet() {
  const spreadsheet = getTargetSpreadsheet();
  let sheet = spreadsheet.getSheetByName(FOLLOW_UP_SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(FOLLOW_UP_SHEET_NAME);
  }

  const firstRow = sheet.getRange(1, 1, 1, FOLLOW_UP_EXPECTED_COLUMNS).getValues()[0];
  const hasHeader = firstRow.some((value) => Boolean(value));

  if (!hasHeader) {
    sheet.getRange(1, 1, 1, FOLLOW_UP_EXPECTED_COLUMNS).setValues([FOLLOW_UP_HEADERS]);
  }

  applyFollowUpSheetDesign(sheet);

  return sheet;
}

function applyLeadResearchSheetDesign(sheet) {
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, LEAD_RESEARCH_EXPECTED_COLUMNS).setValues([LEAD_RESEARCH_HEADERS]);

  const headerRange = sheet.getRange(1, 1, 1, LEAD_RESEARCH_EXPECTED_COLUMNS);
  headerRange
    .setBackground('#5B3A8E')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);

  sheet.setRowHeight(1, 46);
  sheet.setColumnWidth(1, 48);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 180);
  sheet.setColumnWidth(4, 220);
  sheet.setColumnWidth(5, 320);
  sheet.setColumnWidth(6, 380);
  sheet.setColumnWidth(7, 360);
  sheet.setColumnWidth(8, 300);
  sheet.setColumnWidth(9, 280);
  sheet.setColumnWidth(10, 340);
  sheet.setColumnWidth(11, 420);
  sheet.setColumnWidth(12, 110);
  sheet.setColumnWidth(13, 420);
  sheet.setColumnWidth(14, 110);
  sheet.setColumnWidth(15, 420);

  const lastRow = Math.max(sheet.getLastRow(), 2);
  const bodyRange = sheet.getRange(2, 1, lastRow - 1, LEAD_RESEARCH_EXPECTED_COLUMNS);
  bodyRange
    .setWrap(true)
    .setVerticalAlignment('top')
    .setHorizontalAlignment('left');

  sheet.getRange(2, 1, lastRow - 1, 1).setHorizontalAlignment('center');
  sheet.getRange(2, 12, lastRow - 1, 3).setHorizontalAlignment('center');

  if (lastRow > 1) {
    sheet.autoResizeRows(2, lastRow - 1);
  }
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

function applySalesMessageSheetDesign(sheet) {
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, SALES_MESSAGE_EXPECTED_COLUMNS).setValues([SALES_MESSAGE_HEADERS]);

  const headerRange = sheet.getRange(1, 1, 1, SALES_MESSAGE_EXPECTED_COLUMNS);
  headerRange
    .setBackground('#0F5132')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);

  sheet.setRowHeight(1, 46);
  sheet.setColumnWidth(1, 48);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 180);
  sheet.setColumnWidth(4, 220);
  sheet.setColumnWidth(5, 170);
  sheet.setColumnWidth(6, 320);
  sheet.setColumnWidth(7, 320);
  sheet.setColumnWidth(8, 420);
  sheet.setColumnWidth(9, 420);
  sheet.setColumnWidth(10, 240);
  sheet.setColumnWidth(11, 520);
  sheet.setColumnWidth(12, 420);
  sheet.setColumnWidth(13, 420);
  sheet.setColumnWidth(14, 240);
  sheet.setColumnWidth(15, 520);

  const lastRow = Math.max(sheet.getLastRow(), 2);
  const bodyRange = sheet.getRange(2, 1, lastRow - 1, SALES_MESSAGE_EXPECTED_COLUMNS);
  bodyRange
    .setWrap(true)
    .setVerticalAlignment('top')
    .setHorizontalAlignment('left');

  sheet.getRange(2, 1, lastRow - 1, 1).setHorizontalAlignment('center');
  sheet.getRange(2, 5, lastRow - 1, 1).setHorizontalAlignment('center');

  if (lastRow > 1) {
    sheet.autoResizeRows(2, lastRow - 1);
  }
}

function applyFollowUpSheetDesign(sheet) {
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, FOLLOW_UP_EXPECTED_COLUMNS).setValues([FOLLOW_UP_HEADERS]);

  const headerRange = sheet.getRange(1, 1, 1, FOLLOW_UP_EXPECTED_COLUMNS);
  headerRange
    .setBackground('#7A3E00')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);

  sheet.setRowHeight(1, 46);
  sheet.setColumnWidth(1, 48);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 180);
  sheet.setColumnWidth(4, 220);
  sheet.setColumnWidth(5, 150);
  sheet.setColumnWidth(6, 360);
  sheet.setColumnWidth(7, 150);
  sheet.setColumnWidth(8, 360);
  sheet.setColumnWidth(9, 520);
  sheet.setColumnWidth(10, 130);
  sheet.setColumnWidth(11, 110);
  sheet.setColumnWidth(12, 320);

  const lastRow = Math.max(sheet.getLastRow(), 2);
  const bodyRange = sheet.getRange(2, 1, lastRow - 1, FOLLOW_UP_EXPECTED_COLUMNS);
  bodyRange
    .setWrap(true)
    .setVerticalAlignment('top')
    .setHorizontalAlignment('left');

  sheet.getRange(2, 1, lastRow - 1, 1).setHorizontalAlignment('center');
  sheet.getRange(2, 7, lastRow - 1, 1).setHorizontalAlignment('center');
  sheet.getRange(2, 10, lastRow - 1, 2).setHorizontalAlignment('center');

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

function getExistingLeadResearchLeadRows(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return {};

  const leadIdValues = sheet.getRange(2, 3, lastRow - 1, 1).getValues();
  const rowsByLeadId = {};
  leadIdValues.forEach((row, index) => {
    if (row[0]) rowsByLeadId[String(row[0])] = index + 2;
  });
  return rowsByLeadId;
}

function getExistingFollowUpLeadRows(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return {};

  const leadIdValues = sheet.getRange(2, 3, lastRow - 1, 1).getValues();
  const rowsByLeadId = {};
  leadIdValues.forEach((row, index) => {
    if (row[0]) rowsByLeadId[String(row[0])] = index + 2;
  });
  return rowsByLeadId;
}

function getExistingSalesMessageLeadRows(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return {};

  const leadIdValues = sheet.getRange(2, 3, lastRow - 1, 1).getValues();
  const rowsByLeadId = {};
  leadIdValues.forEach((row, index) => {
    if (row[0]) rowsByLeadId[String(row[0])] = index + 2;
  });
  return rowsByLeadId;
}

function findFirstEmptyLeadResearchRow(sheet) {
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

function findFirstEmptySalesMessageRow(sheet) {
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

function findFirstEmptyFollowUpRow(sheet) {
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

function mapLeadResearchToRow(lead, rowNumber) {
  const research = lead.leadResearch || parseLeadResearchReport(lead.leadResearchReport || '');

  return [
    rowNumber - 1,
    lead.createdAt || new Date().toISOString(),
    lead.leadId || '',
    research.restaurantName || lead.restaurantName || '',
    research.searchQuery || '',
    research.searchSummary || '',
    research.websiteFinding || '',
    research.snsFinding || '',
    research.whatsappFinding || '',
    research.menuReservationFinding || '',
    Array.isArray(research.opportunitySignals)
      ? research.opportunitySignals.join('\n')
      : research.opportunitySignals || '',
    research.riskLevel || '',
    research.recommendedNextStep || '',
    research.confidence || '',
    Array.isArray(research.evidenceLinks)
      ? research.evidenceLinks.join('\n')
      : research.evidenceLinks || '',
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

function mapSalesMessageToRow(lead, rowNumber) {
  const messages = lead.salesMessages || parseSalesMessageReport(lead.salesMessageReport || '');

  return [
    rowNumber - 1,
    lead.createdAt || new Date().toISOString(),
    lead.leadId || '',
    messages.restaurantName || lead.restaurantName || '',
    messages.recommendedFtsService || lead.recommendedService || '',
    messages.personalizationSignal || '',
    messages.outreachAngle || '',
    messages.whatsappId || '',
    messages.instagramDmId || '',
    messages.emailSubjectId || '',
    messages.emailBodyId || '',
    messages.whatsappEn || '',
    messages.instagramDmEn || '',
    messages.emailSubjectEn || '',
    messages.emailBodyEn || '',
  ];
}

function mapFollowUpToRow(lead, rowNumber) {
  const followUp = lead.followUp || parseFollowUpReport(lead.followUpReport || '');

  return [
    rowNumber - 1,
    lead.createdAt || new Date().toISOString(),
    lead.leadId || '',
    followUp.restaurantName || lead.restaurantName || '',
    lead.replyReceivedAt || lead.lastContactDate || '',
    followUp.replyText || lead.customerReply || lead.replyText || lead.latestReply || lead.replyNotes || '',
    followUp.classification || '',
    followUp.recommendedAction || '',
    followUp.nextMessage || '',
    followUp.reminderDate || lead.nextFollowUpDate || '',
    followUp.confidence || '',
    followUp.reason || '',
  ];
}

function parseLeadResearchReport(report) {
  const research = {};
  String(report || '').split('\n').forEach((line) => {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) return;

    const key = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();

    if (key === 'restaurant name') research.restaurantName = value;
    if (key === 'search query') research.searchQuery = value;
    if (key === 'search summary') research.searchSummary = value;
    if (key === 'website finding') research.websiteFinding = value;
    if (key === 'sns finding') research.snsFinding = value;
    if (key === 'whatsapp finding') research.whatsappFinding = value;
    if (key === 'menu reservation finding') research.menuReservationFinding = value;
    if (key === 'opportunity signals') research.opportunitySignals = value.split('|').map((item) => item.trim()).filter(Boolean);
    if (key === 'risk level') research.riskLevel = value;
    if (key === 'recommended next step') research.recommendedNextStep = value;
    if (key === 'confidence') research.confidence = value;
    if (key === 'evidence links') research.evidenceLinks = value.split('|').map((item) => item.trim()).filter(Boolean);
  });
  return research;
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

function parseSalesMessageReport(report) {
  const messages = {};
  String(report || '').split('\n').forEach((line) => {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) return;

    const key = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();

    if (key === 'restaurant name') messages.restaurantName = value;
    if (key === 'recommended fts service') messages.recommendedFtsService = value;
    if (key === 'personalization signal') messages.personalizationSignal = value;
    if (key === 'outreach angle') messages.outreachAngle = value;
    if (key === 'whatsapp id') messages.whatsappId = value;
    if (key === 'instagram dm id') messages.instagramDmId = value;
    if (key === 'email subject id') messages.emailSubjectId = value;
    if (key === 'email body id') messages.emailBodyId = value;
    if (key === 'whatsapp en') messages.whatsappEn = value;
    if (key === 'instagram dm en') messages.instagramDmEn = value;
    if (key === 'email subject en') messages.emailSubjectEn = value;
    if (key === 'email body en') messages.emailBodyEn = value;
  });
  return messages;
}

function parseFollowUpReport(report) {
  const followUp = {};
  String(report || '').split('\n').forEach((line) => {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) return;

    const key = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();

    if (key === 'restaurant name') followUp.restaurantName = value;
    if (key === 'reply text') followUp.replyText = value;
    if (key === 'classification') followUp.classification = value;
    if (key === 'recommended action') followUp.recommendedAction = value;
    if (key === 'next message') followUp.nextMessage = value;
    if (key === 'reminder date') followUp.reminderDate = value;
    if (key === 'confidence') followUp.confidence = value;
    if (key === 'reason') followUp.reason = value;
  });
  return followUp;
}

function jsonResponse(body, statusCode) {
  const output = ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}
