const axios = require("axios");

const {
  hasOpenRouterApiKey,
  requestChatCompletion,
} = require("./openRouterService");

function compact(value) {
  return String(value || "").trim();
}

function splitLines(value) {
  return compact(value)
    .split(/\r?\n/)
    .map(compact)
    .filter(Boolean);
}

function buildSearchQuery(lead) {
  return [
    compact(lead.restaurantName),
    compact(lead.researchArea || lead.jakartaArea),
    "restaurant website instagram whatsapp menu reservation",
  ]
    .filter(Boolean)
    .join(" ");
}

function extractJson(content) {
  const text = compact(content);
  if (!text) return "";

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }

  return text;
}

function normalizeResult(result) {
  return {
    title: compact(result.title),
    url: compact(result.url || result.link),
    snippet: compact(result.snippet || result.description || result.content),
    source: compact(result.source),
  };
}

async function searchWithSerper(query) {
  if (!process.env.SERPER_API_KEY) return [];

  const response = await axios.post(
    "https://google.serper.dev/search",
    {
      q: query,
      gl: process.env.SEARCH_GL || "id",
      hl: process.env.SEARCH_HL || "id",
      num: Number(process.env.LEAD_RESEARCH_SEARCH_RESULTS || 5),
    },
    {
      headers: {
        "X-API-KEY": process.env.SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      timeout: Number(process.env.LEAD_RESEARCH_SEARCH_TIMEOUT_MS || 15000),
    },
  );

  return (response.data.organic || []).map((item) =>
    normalizeResult({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
      source: "Serper",
    }),
  );
}

async function searchWithBrave(query) {
  if (!process.env.BRAVE_SEARCH_API_KEY) return [];

  const response = await axios.get("https://api.search.brave.com/res/v1/web/search", {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY,
    },
    params: {
      q: query,
      country: process.env.SEARCH_COUNTRY || "ID",
      search_lang: process.env.SEARCH_LANG || "id",
      count: Number(process.env.LEAD_RESEARCH_SEARCH_RESULTS || 5),
    },
    timeout: Number(process.env.LEAD_RESEARCH_SEARCH_TIMEOUT_MS || 15000),
  });

  return (response.data.web?.results || []).map((item) =>
    normalizeResult({
      title: item.title,
      url: item.url,
      snippet: item.description,
      source: "Brave",
    }),
  );
}

async function searchWithTavily(query) {
  if (!process.env.TAVILY_API_KEY) return [];

  const response = await axios.post(
    "https://api.tavily.com/search",
    {
      api_key: process.env.TAVILY_API_KEY,
      query,
      search_depth: "basic",
      max_results: Number(process.env.LEAD_RESEARCH_SEARCH_RESULTS || 5),
      include_answer: false,
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: Number(process.env.LEAD_RESEARCH_SEARCH_TIMEOUT_MS || 15000),
    },
  );

  return (response.data.results || []).map((item) =>
    normalizeResult({
      title: item.title,
      url: item.url,
      snippet: item.content,
      source: "Tavily",
    }),
  );
}

function configuredSearchProviders() {
  return [
    process.env.SERPER_API_KEY ? "Serper" : "",
    process.env.BRAVE_SEARCH_API_KEY ? "Brave" : "",
    process.env.TAVILY_API_KEY ? "Tavily" : "",
  ].filter(Boolean);
}

async function collectSearchResults(query) {
  if (process.env.LEAD_RESEARCH_ENABLE_WEB_SEARCH !== "true") {
    return [];
  }

  const providers = [
    searchWithSerper,
    searchWithBrave,
    searchWithTavily,
  ];

  for (const provider of providers) {
    try {
      const results = await provider(query);
      if (results.length > 0) return results;
    } catch (error) {
      console.warn(`Lead research search provider failed: ${error.message || error}`);
    }
  }

  return [];
}

async function checkWebsite(url) {
  const websiteUrl = compact(url);
  if (!websiteUrl || process.env.LEAD_RESEARCH_CHECK_WEBSITE === "false") {
    return {
      checked: false,
      status: "",
      finalUrl: websiteUrl,
      title: "",
      description: "",
      signal: websiteUrl ? "Website URL available but not checked." : "No website URL available.",
    };
  }

  try {
    const response = await axios.get(websiteUrl, {
      timeout: Number(process.env.LEAD_RESEARCH_WEBSITE_TIMEOUT_MS || 12000),
      maxRedirects: 3,
      headers: {
        "User-Agent": "FTS Restaurant Research Agent/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
      responseType: "text",
      transformResponse: [(data) => data],
    });
    const html = String(response.data || "").slice(0, 120000);
    const title = compact(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1])
      .replace(/\s+/g, " ")
      .slice(0, 180);
    const description = compact(
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)?.[1],
    )
      .replace(/\s+/g, " ")
      .slice(0, 260);
    const lowered = html.toLowerCase();
    const signals = [];

    if (lowered.includes("whatsapp") || lowered.includes("wa.me")) {
      signals.push("WhatsApp signal found");
    }
    if (lowered.includes("reservation") || lowered.includes("reservasi")) {
      signals.push("reservation signal found");
    }
    if (lowered.includes("menu")) {
      signals.push("menu signal found");
    }
    if (!title && !description) {
      signals.push("low visible metadata");
    }

    return {
      checked: true,
      status: String(response.status),
      finalUrl: response.request?.res?.responseUrl || websiteUrl,
      title,
      description,
      signal: signals.join("; ") || "Website responded but key flow signals need manual review.",
    };
  } catch (error) {
    return {
      checked: true,
      status: error.response?.status ? String(error.response.status) : "Error",
      finalUrl: websiteUrl,
      title: "",
      description: "",
      signal: `Website check failed: ${error.message || error}`,
    };
  }
}

function buildFallbackLeadResearch(lead, evidence = {}) {
  const searchQuery = evidence.searchQuery || buildSearchQuery(lead);
  const searchResults = evidence.searchResults || [];
  const websiteCheck = evidence.websiteCheck || {};
  const signals = [];
  const evidenceLinks = [];

  if (lead.websiteStatus === "Missing" || !compact(lead.websiteUrl)) {
    signals.push("No official website is available in the collected data.");
  } else if (lead.websiteStatus === "Weak") {
    signals.push("Website signal appears weak or points to a social/link profile.");
  } else {
    signals.push("Website URL is available and needs quality review.");
    evidenceLinks.push(compact(lead.websiteUrl));
  }

  if (!compact(lead.instagram) || compact(lead.instagram) === "Need Check") {
    signals.push("Instagram presence needs search/manual check.");
  } else {
    signals.push("Instagram signal is available.");
    evidenceLinks.push(compact(lead.instagram));
  }

  if (!compact(lead.phoneWhatsapp)) {
    signals.push("WhatsApp or phone contact is not clearly available.");
  }

  if (websiteCheck.signal) {
    signals.push(websiteCheck.signal);
  }

  searchResults.forEach((result) => {
    if (result.url) evidenceLinks.push(result.url);
  });

  return {
    restaurantName: compact(lead.restaurantName) || "Unknown Restaurant",
    searchQuery,
    searchSummary:
      searchResults.length > 0
        ? `Found ${searchResults.length} search result(s). Review official website, social profile, and contact flow before outreach.`
        : "No external search provider result was collected. Analysis uses the existing lead data and website probe only.",
    websiteFinding:
      websiteCheck.checked
        ? `${websiteCheck.status || "Checked"}: ${websiteCheck.signal || "Website checked."}`
        : signals.find((signal) => signal.toLowerCase().includes("website")) || "Website needs manual review.",
    snsFinding:
      !compact(lead.instagram) || compact(lead.instagram) === "Need Check"
        ? "Instagram/SNS presence still needs search or manual review."
        : `Instagram/SNS signal available: ${lead.instagram}`,
    whatsappFinding:
      compact(lead.phoneWhatsapp)
        ? "WhatsApp or phone contact is available in the collected data."
        : "WhatsApp or phone contact is missing from the collected data.",
    menuReservationFinding:
      websiteCheck.signal?.includes("menu") || websiteCheck.signal?.includes("reservation")
        ? websiteCheck.signal
        : "Menu and reservation flow still need manual review.",
    opportunitySignals: signals.slice(0, 5),
    riskLevel: compact(lead.phoneWhatsapp) ? "Medium" : "High",
    recommendedNextStep:
      "Review the evidence links, verify official channels, then continue with diagnosis and outreach only if the restaurant is relevant.",
    confidence: searchResults.length > 0 || websiteCheck.checked ? "Medium" : "Low",
    evidenceLinks: [...new Set(evidenceLinks.filter(Boolean))].slice(0, 5),
  };
}

function parseLeadResearch(content, fallback) {
  try {
    const parsed = JSON.parse(extractJson(content));

    return {
      ...fallback,
      restaurantName: compact(parsed.restaurantName) || fallback.restaurantName,
      searchQuery: compact(parsed.searchQuery) || fallback.searchQuery,
      searchSummary: compact(parsed.searchSummary) || fallback.searchSummary,
      websiteFinding: compact(parsed.websiteFinding) || fallback.websiteFinding,
      snsFinding: compact(parsed.snsFinding) || fallback.snsFinding,
      whatsappFinding: compact(parsed.whatsappFinding) || fallback.whatsappFinding,
      menuReservationFinding:
        compact(parsed.menuReservationFinding) || fallback.menuReservationFinding,
      opportunitySignals: Array.isArray(parsed.opportunitySignals)
        ? parsed.opportunitySignals.map(compact).filter(Boolean)
        : splitLines(parsed.opportunitySignals).length > 0
          ? splitLines(parsed.opportunitySignals)
          : fallback.opportunitySignals,
      riskLevel: compact(parsed.riskLevel) || fallback.riskLevel,
      recommendedNextStep:
        compact(parsed.recommendedNextStep) || fallback.recommendedNextStep,
      confidence: compact(parsed.confidence) || fallback.confidence,
      evidenceLinks: Array.isArray(parsed.evidenceLinks)
        ? parsed.evidenceLinks.map(compact).filter(Boolean)
        : fallback.evidenceLinks,
    };
  } catch (_error) {
    return fallback;
  }
}

function buildLeadResearchPrompt(lead, fallback, evidence) {
  return [
    {
      role: "system",
      content:
        "You are AI Lead Research Agent for FTS AI. Analyze restaurant search evidence for sales qualification. Use only provided lead data, search results, and website check data. Do not invent ratings, traffic, revenue, reviews, or facts. Return strict JSON only.",
    },
    {
      role: "user",
      content: JSON.stringify({
        task:
          "Summarize whether this restaurant has digital gaps worth reviewing before diagnosis and sales outreach.",
        outputKeys: [
          "restaurantName",
          "searchQuery",
          "searchSummary",
          "websiteFinding",
          "snsFinding",
          "whatsappFinding",
          "menuReservationFinding",
          "opportunitySignals",
          "riskLevel",
          "recommendedNextStep",
          "confidence",
          "evidenceLinks",
        ],
        allowedRiskLevels: ["Low", "Medium", "High"],
        allowedConfidence: ["Low", "Medium", "High"],
        lead,
        searchEvidence: evidence,
        baselineResearch: fallback,
      }),
    },
  ];
}

function shouldUseAiLeadResearch() {
  return (
    process.env.LEAD_RESEARCH_USE_AI !== "false" &&
    hasOpenRouterApiKey()
  );
}

async function researchLead(lead) {
  const searchQuery = buildSearchQuery(lead);
  const [searchResults, websiteCheck] = await Promise.all([
    collectSearchResults(searchQuery),
    checkWebsite(lead.websiteUrl),
  ]);
  const evidence = {
    searchQuery,
    searchProviders: configuredSearchProviders(),
    searchResults,
    websiteCheck,
  };
  const fallback = buildFallbackLeadResearch(lead, evidence);

  if (!shouldUseAiLeadResearch()) {
    return fallback;
  }

  const response = await requestChatCompletion({
    model:
      process.env.LEAD_RESEARCH_MODEL ||
      process.env.AI_MODEL ||
      process.env.OPENROUTER_MODEL ||
      "openai/gpt-4o-mini",
    fallbackModel:
      process.env.LEAD_RESEARCH_FALLBACK_MODEL ||
      process.env.AI_FALLBACK_MODEL ||
      process.env.OPENROUTER_FALLBACK_MODEL,
    messages: buildLeadResearchPrompt(lead, fallback, evidence),
    temperature: Number(process.env.LEAD_RESEARCH_TEMPERATURE || 0.2),
    maxTokens: Number(process.env.LEAD_RESEARCH_MAX_TOKENS || 1400),
    metadata: {
      agent: "ai-lead-research-agent",
      purpose: "restaurant-lead-web-search-qualification",
    },
  });

  return parseLeadResearch(
    response.choices?.[0]?.message?.content || "",
    fallback,
  );
}

function formatLeadResearch(research) {
  return [
    `Restaurant Name: ${research.restaurantName}`,
    `Search Query: ${research.searchQuery}`,
    `Search Summary: ${research.searchSummary}`,
    `Website Finding: ${research.websiteFinding}`,
    `SNS Finding: ${research.snsFinding}`,
    `WhatsApp Finding: ${research.whatsappFinding}`,
    `Menu Reservation Finding: ${research.menuReservationFinding}`,
    `Opportunity Signals: ${(research.opportunitySignals || []).join(" | ")}`,
    `Risk Level: ${research.riskLevel}`,
    `Recommended Next Step: ${research.recommendedNextStep}`,
    `Confidence: ${research.confidence}`,
    `Evidence Links: ${(research.evidenceLinks || []).join(" | ")}`,
  ].join("\n");
}

module.exports = {
  buildFallbackLeadResearch,
  buildSearchQuery,
  checkWebsite,
  collectSearchResults,
  formatLeadResearch,
  researchLead,
};
