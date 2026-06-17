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
  }

  return enriched;
}

async function runBatch() {
  const targets = selectedTargets();
  if (targets.length === 0) {
    throw new Error("No matching TARGET_AREAS configured.");
  }

  const batchLimit = Number(process.env.BATCH_LIMIT || 50);
  const rawElements = await fetchJakartaRestaurants(targets);
  const normalized = dedupeLeads(rawElements.map(normalizeElement));
  const scored = normalized.map(applyScoring).slice(0, batchLimit);
  const enriched = await enrichPriorityALeads(scored);
  const result = await postLeadsToSheet(enriched);

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
