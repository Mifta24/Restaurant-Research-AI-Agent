const {
  hasOpenRouterApiKey,
  requestChatCompletion,
} = require("./openRouterService");

function compact(value) {
  return String(value || "").trim();
}

function restaurantName(lead) {
  return compact(lead.restaurantName) || "restoran Anda";
}

function recommendedService(lead) {
  return (
    compact(lead.diagnosis?.recommendedFtsService) ||
    compact(lead.recommendedService) ||
    "Restaurant Digital Starter Package"
  );
}

function packageFocus(servicePackage) {
  const normalized = compact(servicePackage).toLowerCase();

  if (normalized === "premium") {
    return {
      id: "AI chatbot, reservasi online, automasi WhatsApp, dan alur customer yang lebih rapi",
      en: "AI chatbot, online reservation, WhatsApp automation, and a cleaner customer journey",
    };
  }

  if (normalized === "middle") {
    return {
      id: "website yang lebih rapi, alur WhatsApp yang jelas, dan bantuan basic AI response",
      en: "a cleaner website, clearer WhatsApp flow, and basic AI response support",
    };
  }

  return {
    id: "website sederhana yang menampilkan menu, lokasi, dan tombol WhatsApp atau reservasi",
    en: "a simple website that shows the menu, location, and WhatsApp or reservation button",
  };
}

function buildPersonalizationSignal(lead) {
  const diagnosis = lead.diagnosis || {};

  if (compact(diagnosis.mainProblem)) {
    return diagnosis.mainProblem;
  }

  if (lead.websiteStatus === "Missing" || !lead.websiteUrl) {
    return "The restaurant does not have a clear owned website in the collected data.";
  }

  if (lead.websiteStatus === "Weak") {
    return "The restaurant appears to rely on a social or link profile instead of a proper website.";
  }

  if (!compact(lead.phoneWhatsapp)) {
    return "WhatsApp or phone contact is not clearly visible in the collected data.";
  }

  return "The restaurant already has an online location presence, and the next step is making the customer journey clearer.";
}

function buildIdOpening(lead) {
  const name = restaurantName(lead);

  if (lead.websiteStatus === "Missing" || !lead.websiteUrl) {
    return `Kami melihat ${name} sudah punya profil lokasi online, tetapi belum terlihat punya website resmi yang rapi.`;
  }

  if (lead.websiteStatus === "Weak") {
    return `Kami melihat ${name} sudah punya kehadiran online, tetapi alur menu, lokasi, dan reservasi masih bisa dibuat lebih rapi.`;
  }

  return `Kami melihat ${name} sudah punya kehadiran online, dan masih ada peluang untuk membuat pengalaman calon customer lebih mudah dari awal sampai reservasi.`;
}

function buildEnOpening(lead) {
  const name = restaurantName(lead);

  if (lead.websiteStatus === "Missing" || !lead.websiteUrl) {
    return `We noticed that ${name} already has an online location presence, but we did not see a clear official website.`;
  }

  if (lead.websiteStatus === "Weak") {
    return `We noticed that ${name} already has an online presence, and the menu, location, and reservation flow could be made clearer.`;
  }

  return `We noticed that ${name} already has an online presence, and there may be room to make the customer journey easier from discovery to reservation.`;
}

function buildFallbackSalesMessages(lead) {
  const name = restaurantName(lead);
  const service = recommendedService(lead);
  const focus = packageFocus(service);
  const idOpening = buildIdOpening(lead);
  const enOpening = buildEnOpening(lead);

  return {
    restaurantName: name,
    recommendedFtsService: service,
    personalizationSignal: buildPersonalizationSignal(lead),
    outreachAngle:
      "Professional, helpful outreach focused on improving the restaurant's online customer journey.",
    whatsappId:
      `Halo ${name}, saya dari FTS AI. ${idOpening} Kami bisa bantu membuat ${focus.id} supaya calon customer lebih mudah melihat info penting dan menghubungi restoran. Kalau berkenan, saya bisa kirim contoh konsep singkatnya.`,
    instagramDmId:
      `Halo ${name}, izin kenalan. ${idOpening} Kami membantu restoran merapikan tampilan online seperti menu, lokasi, dan jalur WhatsApp/reservasi agar calon customer lebih mudah mengambil keputusan. Boleh saya kirim contoh pendekatan yang cocok untuk ${name}?`,
    emailSubjectId: `Ide merapikan sistem online untuk ${name}`,
    emailBodyId:
      `Halo tim ${name},\n\n${idOpening}\n\nKami dari FTS AI membantu restoran membuat ${focus.id}. Tujuannya sederhana: calon customer lebih mudah melihat menu, lokasi, dan cara melakukan reservasi atau menghubungi restoran.\n\nJika berkenan, kami bisa kirimkan contoh konsep singkat yang disesuaikan dengan kondisi ${name} saat ini.\n\nTerima kasih,\nFTS AI`,
    whatsappEn:
      `Hi ${name}, this is FTS AI. ${enOpening} We help restaurants build ${focus.en} so potential customers can find key information and contact the restaurant more easily. If useful, I can send a short concept example.`,
    instagramDmEn:
      `Hi ${name}, nice to connect. ${enOpening} We help restaurants organize their online menu, location, and WhatsApp/reservation path so customers can decide more easily. May I send a short idea that could fit ${name}?`,
    emailSubjectEn: `Idea to improve ${name}'s online customer journey`,
    emailBodyEn:
      `Hi ${name} team,\n\n${enOpening}\n\nWe are FTS AI, and we help restaurants build ${focus.en}. The goal is simple: make it easier for potential customers to see the menu, location, and reservation or contact options.\n\nIf helpful, we can send a short concept tailored to ${name}'s current online presence.\n\nBest regards,\nFTS AI`,
  };
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

function parseSalesMessages(content, fallback) {
  try {
    const parsed = JSON.parse(extractJson(content));
    return {
      ...fallback,
      restaurantName: compact(parsed.restaurantName) || fallback.restaurantName,
      recommendedFtsService:
        compact(parsed.recommendedFtsService) || fallback.recommendedFtsService,
      personalizationSignal:
        compact(parsed.personalizationSignal) || fallback.personalizationSignal,
      outreachAngle: compact(parsed.outreachAngle) || fallback.outreachAngle,
      whatsappId: compact(parsed.whatsappId) || fallback.whatsappId,
      instagramDmId: compact(parsed.instagramDmId) || fallback.instagramDmId,
      emailSubjectId: compact(parsed.emailSubjectId) || fallback.emailSubjectId,
      emailBodyId: compact(parsed.emailBodyId) || fallback.emailBodyId,
      whatsappEn: compact(parsed.whatsappEn) || fallback.whatsappEn,
      instagramDmEn: compact(parsed.instagramDmEn) || fallback.instagramDmEn,
      emailSubjectEn: compact(parsed.emailSubjectEn) || fallback.emailSubjectEn,
      emailBodyEn: compact(parsed.emailBodyEn) || fallback.emailBodyEn,
    };
  } catch (_error) {
    return fallback;
  }
}

function buildSalesMessagePrompt(lead, fallback) {
  return [
    {
      role: "system",
      content:
        "You are Sales Message Agent for FTS AI. You write natural, professional outreach for restaurants. Do not use aggressive hard selling. Do not invent facts. Use only the provided lead and diagnosis data. Return strict JSON only.",
    },
    {
      role: "user",
      content: JSON.stringify({
        task:
          "Create personal outreach messages in Indonesian and English for WhatsApp, Instagram DM, and email.",
        toneRules: [
          "Natural, respectful, consultative, and concise.",
          "Do not sound spammy.",
          "Do not claim a rating, Google Maps reputation, revenue, or traffic unless it exists in the lead data.",
          "Position FTS as helping organize the online customer journey: menu, location, WhatsApp, reservation, website, or AI support.",
        ],
        outputKeys: [
          "restaurantName",
          "recommendedFtsService",
          "personalizationSignal",
          "outreachAngle",
          "whatsappId",
          "instagramDmId",
          "emailSubjectId",
          "emailBodyId",
          "whatsappEn",
          "instagramDmEn",
          "emailSubjectEn",
          "emailBodyEn",
        ],
        lead,
        baselineMessages: fallback,
      }),
    },
  ];
}

function shouldUseAiSalesMessages() {
  return (
    process.env.SALES_MESSAGE_USE_AI === "true" &&
    hasOpenRouterApiKey()
  );
}

async function generateSalesMessages(lead) {
  const fallback = buildFallbackSalesMessages(lead);

  if (!shouldUseAiSalesMessages()) {
    return fallback;
  }

  const response = await requestChatCompletion({
    model:
      process.env.SALES_MESSAGE_MODEL ||
      process.env.OPENROUTER_MODEL ||
      "openai/gpt-4o-mini",
    fallbackModel:
      process.env.SALES_MESSAGE_FALLBACK_MODEL ||
      process.env.OPENROUTER_FALLBACK_MODEL,
    messages: buildSalesMessagePrompt(lead, fallback),
    temperature: Number(process.env.SALES_MESSAGE_TEMPERATURE || 0.45),
    maxTokens: Number(process.env.SALES_MESSAGE_MAX_TOKENS || 1200),
    metadata: {
      agent: "sales-message-agent",
      purpose: "restaurant-outreach-message-variants",
    },
  });

  return parseSalesMessages(
    response.choices?.[0]?.message?.content || "",
    fallback,
  );
}

function formatSalesMessages(messages) {
  return [
    `Restaurant Name: ${messages.restaurantName}`,
    `Recommended FTS Service: ${messages.recommendedFtsService}`,
    `Personalization Signal: ${messages.personalizationSignal}`,
    `Outreach Angle: ${messages.outreachAngle}`,
    `WhatsApp ID: ${messages.whatsappId}`,
    `Instagram DM ID: ${messages.instagramDmId}`,
    `Email Subject ID: ${messages.emailSubjectId}`,
    `Email Body ID: ${messages.emailBodyId}`,
    `WhatsApp EN: ${messages.whatsappEn}`,
    `Instagram DM EN: ${messages.instagramDmEn}`,
    `Email Subject EN: ${messages.emailSubjectEn}`,
    `Email Body EN: ${messages.emailBodyEn}`,
  ].join("\n");
}

module.exports = {
  buildFallbackSalesMessages,
  generateSalesMessages,
  formatSalesMessages,
};
