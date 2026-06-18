const {
  hasOpenRouterApiKey,
  requestChatCompletion,
} = require("./openRouterService");

const SERVICE_PACKAGES = {
  BASIC: "Basic",
  MIDDLE: "Middle",
  PREMIUM: "Premium",
};

function compact(value) {
  return String(value || "").trim();
}

function isKnown(value) {
  const text = compact(value).toLowerCase();
  return Boolean(text) && !["need check", "unknown", "n/a", "-"].includes(text);
}

function websiteDiagnosis(lead) {
  if (lead.websiteStatus === "Missing" || !lead.websiteUrl) {
    return {
      status: "Missing",
      problem: "Restaurant does not have a clear owned website in the collected data.",
      signalScore: 3,
    };
  }

  if (lead.websiteStatus === "Weak") {
    return {
      status: "Weak",
      problem:
        "Restaurant appears to depend on a social/link profile instead of a proper website.",
      signalScore: 2,
    };
  }

  return {
    status: "Found",
    problem:
      "Website exists, but design quality, menu clarity, reservation flow, and branding still need manual review.",
    signalScore: 0,
  };
}

function instagramDiagnosis(lead) {
  if (!isKnown(lead.instagram)) {
    return {
      status: "Need Check",
      problem: "Instagram presence and activity are not confirmed from the collected data.",
      signalScore: 1,
    };
  }

  return {
    status: "Found",
    problem:
      "Instagram handle is available, but posting activity and content quality still need manual review.",
    signalScore: 0,
  };
}

function whatsappDiagnosis(lead) {
  if (!isKnown(lead.phoneWhatsapp)) {
    return {
      status: "Missing",
      problem: "WhatsApp or phone contact is not clearly available.",
      signalScore: 2,
    };
  }

  return {
    status: "Found",
    problem:
      "WhatsApp or phone contact is available; ease of discovery on the restaurant website still needs review.",
    signalScore: 0,
  };
}

function locationDiagnosis(lead) {
  if (lead.locationClear !== "Yes") {
    return {
      status: "Unclear",
      problem: "Restaurant location is not clear enough in the collected data.",
      signalScore: 1,
    };
  }

  return {
    status: "Clear",
    problem: "Location coordinates are available.",
    signalScore: 0,
  };
}

function chooseServicePackage({ website, whatsapp, instagram, lead }) {
  if (website.status === "Missing") {
    return SERVICE_PACKAGES.BASIC;
  }

  if (website.status === "Weak" || whatsapp.status === "Missing") {
    return SERVICE_PACKAGES.MIDDLE;
  }

  if (
    website.status === "Found" &&
    whatsapp.status === "Found" &&
    instagram.status === "Found" &&
    lead.priority === "Priority A"
  ) {
    return SERVICE_PACKAGES.PREMIUM;
  }

  return SERVICE_PACKAGES.MIDDLE;
}

function chooseDiagnosisPriority({ servicePackage, signalScore, lead }) {
  if (servicePackage === SERVICE_PACKAGES.PREMIUM) {
    return "Priority A";
  }

  if (signalScore >= 4 && isKnown(lead.phoneWhatsapp)) {
    return "Priority A";
  }

  if (signalScore >= 2 || lead.priority === "Priority B") {
    return "Priority B";
  }

  return lead.priority || "Priority C";
}

function buildHeuristicDiagnosis(lead) {
  const website = websiteDiagnosis(lead);
  const instagram = instagramDiagnosis(lead);
  const whatsapp = whatsappDiagnosis(lead);
  const location = locationDiagnosis(lead);
  const signalScore =
    website.signalScore +
    instagram.signalScore +
    whatsapp.signalScore +
    location.signalScore;
  const recommendedFtsService = chooseServicePackage({
    website,
    whatsapp,
    instagram,
    lead,
  });
  const priority = chooseDiagnosisPriority({
    servicePackage: recommendedFtsService,
    signalScore,
    lead,
  });
  const problems = [website, whatsapp, instagram, location]
    .filter((item) => item.signalScore > 0)
    .map((item) => item.problem);
  const mainProblem =
    problems[0] ||
    "Main digital marketing condition needs manual review before outreach.";

  return {
    restaurantName: lead.restaurantName || "Unknown Restaurant",
    currentSituation: [
      `Website: ${website.status}.`,
      `Instagram: ${instagram.status}.`,
      `WhatsApp/contact: ${whatsapp.status}.`,
      `Location: ${location.status}.`,
    ].join(" "),
    mainProblem,
    improvementSuggestion: suggestionForPackage(recommendedFtsService, {
      website,
      whatsapp,
      instagram,
    }),
    recommendedFtsService,
    priority,
    evidenceGaps: [
      "Website design quality/outdated status needs manual website review.",
      "Instagram activity needs manual profile review.",
      "Reservation system, menu clarity, and branding quality are not confirmed by OpenStreetMap data.",
    ],
  };
}

function suggestionForPackage(servicePackage, { website, whatsapp, instagram }) {
  if (servicePackage === SERVICE_PACKAGES.BASIC) {
    return "Start with a simple professional landing page or website that shows menu highlights, location, and WhatsApp contact clearly.";
  }

  if (servicePackage === SERVICE_PACKAGES.PREMIUM) {
    return "Upgrade the digital flow with AI chatbot, reservation handling, WhatsApp automation, and clearer customer journey tracking.";
  }

  const focusAreas = [];
  if (website.status !== "Found") focusAreas.push("website");
  if (whatsapp.status !== "Found") focusAreas.push("WhatsApp flow");
  if (instagram.status !== "Found") focusAreas.push("Instagram visibility");

  return `Improve the ${focusAreas.join(", ") || "website and WhatsApp journey"} with a stronger website, clear contact flow, and basic AI response support.`;
}

function parseDiagnosis(content, fallback) {
  try {
    const parsed = JSON.parse(content);
    return {
      ...fallback,
      restaurantName: compact(parsed.restaurantName) || fallback.restaurantName,
      currentSituation:
        compact(parsed.currentSituation) || fallback.currentSituation,
      mainProblem: compact(parsed.mainProblem) || fallback.mainProblem,
      improvementSuggestion:
        compact(parsed.improvementSuggestion) || fallback.improvementSuggestion,
      recommendedFtsService:
        compact(parsed.recommendedFtsService) || fallback.recommendedFtsService,
      priority: compact(parsed.priority) || fallback.priority,
      evidenceGaps: Array.isArray(parsed.evidenceGaps)
        ? parsed.evidenceGaps.map(compact).filter(Boolean)
        : fallback.evidenceGaps,
    };
  } catch (_error) {
    return fallback;
  }
}

function buildDiagnosisPrompt(lead, fallback) {
  return [
    {
      role: "system",
      content:
        "You are Restaurant Diagnosis Agent for FTS. Analyze restaurant digital marketing readiness from the provided lead data only. Do not invent facts. If data is unknown, mark it as needs manual check. Return strict JSON only.",
    },
    {
      role: "user",
      content: JSON.stringify({
        task:
          "Diagnose the restaurant's marketing condition and recommend the best FTS package.",
        serviceRules: {
          Basic:
            "For restaurants that mainly need a landing page or simple website.",
          Middle:
            "For restaurants that need website improvement, WhatsApp flow, and basic AI response.",
          Premium:
            "For restaurants ready for AI chatbot, reservation system, and broader automation.",
        },
        outputKeys: [
          "restaurantName",
          "currentSituation",
          "mainProblem",
          "improvementSuggestion",
          "recommendedFtsService",
          "priority",
          "evidenceGaps",
        ],
        allowedServices: ["Basic", "Middle", "Premium"],
        allowedPriorities: ["Priority A", "Priority B", "Priority C"],
        lead,
        baselineDiagnosis: fallback,
      }),
    },
  ];
}

function shouldUseAiDiagnosis() {
  return (
    process.env.DIAGNOSIS_USE_AI !== "false" &&
    hasOpenRouterApiKey()
  );
}

async function diagnoseRestaurant(lead) {
  const fallback = buildHeuristicDiagnosis(lead);

  if (!shouldUseAiDiagnosis()) {
    return fallback;
  }

  const response = await requestChatCompletion({
    model:
      process.env.DIAGNOSIS_MODEL ||
      process.env.OPENROUTER_MODEL ||
      "openai/gpt-4o-mini",
    fallbackModel:
      process.env.DIAGNOSIS_FALLBACK_MODEL ||
      process.env.OPENROUTER_FALLBACK_MODEL,
    messages: buildDiagnosisPrompt(lead, fallback),
    temperature: Number(process.env.DIAGNOSIS_TEMPERATURE || 0.2),
    maxTokens: Number(process.env.DIAGNOSIS_MAX_TOKENS || 700),
    metadata: {
      agent: "restaurant-diagnosis-agent",
      purpose: "restaurant-marketing-diagnosis",
    },
  });

  return parseDiagnosis(response.choices?.[0]?.message?.content || "", fallback);
}

function formatDiagnosis(diagnosis) {
  return [
    `Restaurant Name: ${diagnosis.restaurantName}`,
    `Current Situation: ${diagnosis.currentSituation}`,
    `Main Problem: ${diagnosis.mainProblem}`,
    `Improvement Suggestion: ${diagnosis.improvementSuggestion}`,
    `Recommended FTS Service: ${diagnosis.recommendedFtsService}`,
    `Priority: ${diagnosis.priority}`,
  ].join("\n");
}

module.exports = {
  buildHeuristicDiagnosis,
  diagnoseRestaurant,
  formatDiagnosis,
};
