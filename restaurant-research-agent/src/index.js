require("dotenv").config();

const cron = require("node-cron");
const { selectedTargets } = require("./config/targets");
const { fetchJakartaRestaurants } = require("./services/overpassService");
const { applyScoring } = require("./services/scoringService");
const { generateSalesNotes } = require("./services/openRouterService");
const {
  diagnoseRestaurant,
  formatDiagnosis,
} = require("./services/diagnosisService");
const {
  generateSalesMessages,
  formatSalesMessages,
} = require("./services/salesMessageService");
const {
  classifyFollowUpReply,
  formatFollowUp,
  replyText,
} = require("./services/followUpService");
const { postLeadsToSheet } = require("./services/googleSheetService");
const { dedupeLeads, normalizeElement } = require("./utils/normalizer");

function logError(error) {
  if (error.response) {
    console.error(
      JSON.stringify(
        {
          message: error.message,
          status: error.response.status,
          data: error.response.data,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.error(error.message || error);
}

async function enrichPriorityALeads(leads) {
  if (process.env.ENABLE_AI_NOTES !== "true") {
    return leads;
  }

  const maxNotes = Number(process.env.OPENROUTER_MAX_NOTES || 20);
  let generated = 0;
  const enriched = [];

  const priorityACount = leads.filter((lead) => lead.priority === "Priority A").length;
  console.log(`Generating AI sales notes for up to ${Math.min(maxNotes, priorityACount)} Priority A leads...`);

  for (const lead of leads) {
    if (lead.priority !== "Priority A" || generated >= maxNotes) {
      enriched.push(lead);
      continue;
    }

    const notes = await generateSalesNotes(lead);
    enriched.push({
      ...lead,
      aiSalesNotes: notes.aiSalesNotes || "",
      recommendedService:
        notes.recommendedService || "Restaurant Digital Starter Package",
      outreachMessage: notes.outreachMessage || "",
    });
    generated += 1;
    console.log(`  -> [${generated}/${maxNotes}] notes generated for ${lead.restaurantName || lead.leadId}`);
  }

  return enriched;
}

async function diagnoseLeads(leads) {
  if (process.env.ENABLE_DIAGNOSIS_AGENT !== "true") {
    return leads;
  }

  const maxDiagnoses = Number(process.env.DIAGNOSIS_MAX_LEADS || 20);
  let generated = 0;
  const diagnosed = [];

  console.log(`Running Restaurant Diagnosis Agent for up to ${Math.min(maxDiagnoses, leads.length)} leads...`);

  for (const lead of leads) {
    if (generated >= maxDiagnoses) {
      diagnosed.push(lead);
      continue;
    }

    const diagnosis = await diagnoseRestaurant(lead);
    diagnosed.push({
      ...lead,
      diagnosis,
      diagnosisReport: formatDiagnosis(diagnosis),
      recommendedService: diagnosis.recommendedFtsService,
      priority: diagnosis.priority || lead.priority,
      manualCheckNotes: Array.isArray(diagnosis.evidenceGaps)
        ? diagnosis.evidenceGaps.join(" ")
        : lead.manualCheckNotes,
    });
    generated += 1;
    console.log(`  -> [${generated}/${maxDiagnoses}] diagnosis generated for ${lead.restaurantName || lead.leadId}`);
  }

  return diagnosed;
}

async function generateSalesMessagesForLeads(leads) {
  if (process.env.ENABLE_SALES_MESSAGE_AGENT !== "true") {
    return leads;
  }

  const maxMessages = Number(process.env.SALES_MESSAGE_MAX_LEADS || 20);
  let generated = 0;
  const enriched = [];

  console.log(`Running Sales Message Agent for up to ${Math.min(maxMessages, leads.length)} leads...`);

  for (const lead of leads) {
    if (generated >= maxMessages) {
      enriched.push(lead);
      continue;
    }

    const salesMessages = await generateSalesMessages(lead);
    enriched.push({
      ...lead,
      salesMessages,
      salesMessageReport: formatSalesMessages(salesMessages),
      outreachMessage: salesMessages.whatsappId || lead.outreachMessage,
    });
    generated += 1;
    console.log(`  -> [${generated}/${maxMessages}] sales messages generated for ${lead.restaurantName || lead.leadId}`);
  }

  return enriched;
}

async function classifyFollowUpsForLeads(leads) {
  if (process.env.ENABLE_FOLLOW_UP_AGENT !== "true") {
    return leads;
  }

  const replyLeads = leads.filter((lead) => replyText(lead));
  const maxFollowUps = Number(process.env.FOLLOW_UP_MAX_LEADS || 20);
  let generated = 0;
  const enriched = [];

  console.log(`Running Follow-up Agent for up to ${Math.min(maxFollowUps, replyLeads.length)} replied lead(s)...`);

  for (const lead of leads) {
    if (!replyText(lead) || generated >= maxFollowUps) {
      enriched.push(lead);
      continue;
    }

    const followUp = await classifyFollowUpReply(lead);
    enriched.push({
      ...lead,
      followUp,
      followUpReport: formatFollowUp(followUp),
      leadStatus: followUp.classification,
      outreachStatus:
        followUp.classification === "Not Interested" ? "Closed" : "Replied",
      nextFollowUpDate:
        followUp.reminderDate || lead.nextFollowUpDate || "",
      outreachMessage: followUp.nextMessage || lead.outreachMessage,
    });
    generated += 1;
    console.log(`  -> [${generated}/${maxFollowUps}] follow-up classified for ${lead.restaurantName || lead.leadId}`);
  }

  return enriched;
}

async function runBatch() {
  const targets = selectedTargets();
  if (targets.length === 0) {
    throw new Error("No matching TARGET_AREAS configured.");
  }

  const batchLimit = Number(process.env.BATCH_LIMIT || 50);

  console.log(`Starting batch for ${targets.length} target area(s): ${targets.map((t) => t.name).join(", ")}`);

  const rawElements = await fetchJakartaRestaurants(targets);
  console.log(`Fetched ${rawElements.length} raw places total.`);

  const normalized = dedupeLeads(rawElements.map(normalizeElement));
  console.log(`Normalized + deduped to ${normalized.length} unique leads.`);

  const scored = normalized.map(applyScoring).slice(0, batchLimit);
  console.log(`Scored leads, keeping top ${scored.length} (batch limit ${batchLimit}).`);

  const salesEnriched = await enrichPriorityALeads(scored);
  const diagnosed = await diagnoseLeads(salesEnriched);
  const messageEnriched = await generateSalesMessagesForLeads(diagnosed);
  const enriched = await classifyFollowUpsForLeads(messageEnriched);
  const diagnosisPayloadCount = diagnosed.filter(
    (lead) => lead.diagnosis || lead.diagnosisReport,
  ).length;
  const salesMessagePayloadCount = enriched.filter(
    (lead) => lead.salesMessages || lead.salesMessageReport,
  ).length;
  const followUpPayloadCount = enriched.filter(
    (lead) => lead.followUp || lead.followUpReport,
  ).length;
  if (process.env.ENABLE_DIAGNOSIS_AGENT === "true") {
    console.log(`Prepared ${diagnosisPayloadCount} diagnosis payload(s) for Google Sheet.`);
  }
  if (process.env.ENABLE_SALES_MESSAGE_AGENT === "true") {
    console.log(`Prepared ${salesMessagePayloadCount} sales message payload(s) for Google Sheet.`);
  }
  if (process.env.ENABLE_FOLLOW_UP_AGENT === "true") {
    console.log(`Prepared ${followUpPayloadCount} follow-up payload(s) for Google Sheet.`);
  }

  console.log("Posting leads to Google Sheet...");
  const result = await postLeadsToSheet(enriched);
  console.log("Done posting to sheet.");

  console.log(
    JSON.stringify(
      {
        targets: targets.map((target) => target.name),
        rawCount: rawElements.length,
        postedCount: enriched.length,
        priorityA: enriched.filter((lead) => lead.priority === "Priority A").length,
        sheetResult: result,
      },
      null,
      2,
    ),
  );
}

if (process.env.ENABLE_CRON === "true") {
  cron.schedule(process.env.CRON_SCHEDULE || "0 9 * * *", () => {
    runBatch().catch((error) => {
      logError(error);
      process.exitCode = 1;
    });
  });
} else {
  runBatch().catch((error) => {
    logError(error);
    process.exit(1);
  });
}

module.exports = {
  runBatch,
};
