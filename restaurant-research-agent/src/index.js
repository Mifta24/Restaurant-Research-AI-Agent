require("dotenv").config();

const cron = require("node-cron");
const { selectedTargets } = require("./config/targets");
const { fetchJakartaRestaurants } = require("./services/overpassService");
const { applyScoring } = require("./services/scoringService");
const { generateSalesNotes } = require("./services/openRouterService");
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

  const enriched = await enrichPriorityALeads(scored);

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
