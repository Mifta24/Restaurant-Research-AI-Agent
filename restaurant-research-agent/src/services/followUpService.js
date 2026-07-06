const {
  hasOpenRouterApiKey,
  requestChatCompletion,
} = require("./openRouterService");

const CLASSIFICATIONS = {
  INTERESTED: "Interested",
  CONTACT_LATER: "Contact Later",
  NOT_INTERESTED: "Not Interested",
  NEED_MEETING: "Need Meeting",
};

function compact(value) {
  return String(value || "").trim();
}

function restaurantName(lead) {
  return compact(lead.restaurantName) || "restoran Anda";
}

function replyText(lead) {
  return (
    compact(lead.customerReply) ||
    compact(lead.replyText) ||
    compact(lead.latestReply) ||
    compact(lead.replyNotes)
  );
}

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function reminderDateForReply(reply, classification) {
  const normalized = reply.toLowerCase();

  if (classification === CLASSIFICATIONS.NOT_INTERESTED) {
    return "";
  }

  if (classification === CLASSIFICATIONS.NEED_MEETING) {
    return addDays(1);
  }

  if (classification === CLASSIFICATIONS.INTERESTED) {
    return addDays(2);
  }

  if (normalized.includes("besok") || normalized.includes("tomorrow")) {
    return addDays(1);
  }

  if (
    normalized.includes("minggu depan") ||
    normalized.includes("next week")
  ) {
    return addDays(7);
  }

  if (
    normalized.includes("bulan depan") ||
    normalized.includes("next month")
  ) {
    return addDays(30);
  }

  return addDays(14);
}

function recommendedService(lead) {
  return (
    compact(lead.diagnosis?.recommendedFtsService) ||
    compact(lead.recommendedService) ||
    compact(lead.salesMessages?.recommendedFtsService) ||
    "Restaurant Digital Starter Package"
  );
}

function nextMessageFor(classification, lead) {
  const name = restaurantName(lead);
  const service = recommendedService(lead);

  if (classification === CLASSIFICATIONS.NEED_MEETING) {
    return `Terima kasih, tim ${name}. Boleh, kita jadwalkan meeting singkat 20-30 menit untuk bahas kebutuhan ${name} dan paket ${service} yang paling cocok. Apakah ada waktu yang nyaman minggu ini?`;
  }

  if (classification === CLASSIFICATIONS.CONTACT_LATER) {
    return `Baik, terima kasih infonya. Saya follow up lagi sesuai waktu yang lebih pas. Nanti saya bisa kirim ringkasan pendek tentang paket ${service} untuk ${name} agar mudah direview.`;
  }

  if (classification === CLASSIFICATIONS.NOT_INTERESTED) {
    return `Baik, terima kasih sudah membalas. Kami tidak akan follow up lagi untuk saat ini. Semoga operasional ${name} berjalan lancar.`;
  }

  return `Terima kasih, tim ${name}. Saya kirimkan detail paket ${service} yang relevan untuk kondisi ${name}, termasuk opsi setup website, WhatsApp/reservasi, dan dukungan AI sesuai kebutuhan. Setelah itu kita bisa lanjut meeting singkat jika ada yang ingin dibahas.`;
}

function buildFallbackFollowUp(lead) {
  const reply = replyText(lead);
  const normalized = reply.toLowerCase();
  let classification = CLASSIFICATIONS.INTERESTED;
  let reason = "The reply is open to receiving more details.";
  let recommendedAction = "Send package details and invite the restaurant to a short discussion.";
  let confidence = "Medium";

  if (!reply) {
    classification = CLASSIFICATIONS.CONTACT_LATER;
    reason = "No reply text is available yet.";
    recommendedAction = "Wait for a real reply before taking the next sales action.";
    confidence = "Low";
  } else if (
    /meeting|meet|call|telepon|telpon|zoom|gmeet|jadwal|schedule|ketemu|demo|presentasi/i.test(reply)
  ) {
    classification = CLASSIFICATIONS.NEED_MEETING;
    reason = "The reply asks for or implies a meeting, call, demo, or schedule.";
    recommendedAction = "Propose two or three meeting slots and confirm the decision maker.";
    confidence = "High";
  } else if (
    /tidak|nggak|gak|ga |belum tertarik|not interested|no thanks|jangan|stop|sudah ada|already have|vendor/i.test(reply)
  ) {
    classification = CLASSIFICATIONS.NOT_INTERESTED;
    reason = "The reply declines the offer or asks not to continue.";
    recommendedAction = "Close the lead politely and avoid further follow-up unless they re-engage.";
    confidence = "High";
  } else if (
    /bulan depan|minggu depan|nanti|later|next month|next week|belum sekarang|not now|lain waktu|q[1-4]|quarter/i.test(reply)
  ) {
    classification = CLASSIFICATIONS.CONTACT_LATER;
    reason = "The reply shows potential interest but asks to continue at a later time.";
    recommendedAction = "Create a reminder and send a light follow-up near the requested timing.";
    confidence = "High";
  } else if (
    /boleh|kirim|detail|info|harga|price|package|paket|proposal|tertarik|interested|yes|ya|ok|oke/i.test(reply)
  ) {
    classification = CLASSIFICATIONS.INTERESTED;
    reason = "The reply asks for information, detail, pricing, a package, or a proposal.";
    recommendedAction = "Send the most relevant package explanation and offer a meeting.";
    confidence = "High";
  } else if (normalized.includes("?")) {
    classification = CLASSIFICATIONS.INTERESTED;
    reason = "The reply contains a question, which indicates engagement.";
    recommendedAction = "Answer the question directly and include a concise package next step.";
    confidence = "Medium";
  }

  return {
    restaurantName: restaurantName(lead),
    replyText: reply,
    classification,
    recommendedAction,
    nextMessage: nextMessageFor(classification, lead),
    reminderDate: reminderDateForReply(reply, classification),
    confidence,
    reason,
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

function normalizeClassification(value, fallback) {
  const normalized = compact(value).toLowerCase();
  const match = Object.values(CLASSIFICATIONS).find(
    (classification) => classification.toLowerCase() === normalized,
  );
  return match || fallback;
}

function parseFollowUp(content, fallback) {
  try {
    const parsed = JSON.parse(extractJson(content));
    const classification = normalizeClassification(
      parsed.classification,
      fallback.classification,
    );

    return {
      ...fallback,
      restaurantName: compact(parsed.restaurantName) || fallback.restaurantName,
      replyText: compact(parsed.replyText) || fallback.replyText,
      classification,
      recommendedAction:
        compact(parsed.recommendedAction) || fallback.recommendedAction,
      nextMessage: compact(parsed.nextMessage) || fallback.nextMessage,
      reminderDate: compact(parsed.reminderDate) || fallback.reminderDate,
      confidence: compact(parsed.confidence) || fallback.confidence,
      reason: compact(parsed.reason) || fallback.reason,
    };
  } catch (_error) {
    return fallback;
  }
}

function buildFollowUpPrompt(lead, fallback) {
  return [
    {
      role: "system",
      content:
        "You are Follow-up Agent for FTS AI. Classify restaurant prospect replies and recommend the next sales action. Use only the provided reply and lead data. Return strict JSON only.",
    },
    {
      role: "user",
      content: JSON.stringify({
        task:
          "Classify the prospect reply and create the next action for the sales process.",
        allowedClassifications: Object.values(CLASSIFICATIONS),
        classificationRules: {
          Interested:
            "The restaurant is open to details, package information, pricing, a proposal, or further explanation.",
          "Contact Later":
            "The restaurant does not reject the offer but asks to continue later.",
          "Not Interested":
            "The restaurant declines, says no, asks to stop, or says they already have a solution.",
          "Need Meeting":
            "The restaurant asks for or needs a call, meeting, demo, or schedule confirmation.",
        },
        outputKeys: [
          "restaurantName",
          "replyText",
          "classification",
          "recommendedAction",
          "nextMessage",
          "reminderDate",
          "confidence",
          "reason",
        ],
        lead,
        baselineFollowUp: fallback,
      }),
    },
  ];
}

function shouldUseAiFollowUp() {
  return (
    process.env.FOLLOW_UP_USE_AI !== "false" &&
    hasOpenRouterApiKey()
  );
}

async function classifyFollowUpReply(lead) {
  const fallback = buildFallbackFollowUp(lead);

  if (!shouldUseAiFollowUp()) {
    return fallback;
  }

  const response = await requestChatCompletion({
    model:
      process.env.FOLLOW_UP_MODEL ||
      process.env.AI_MODEL ||
      process.env.OPENROUTER_MODEL ||
      "openai/gpt-4o-mini",
    fallbackModel:
      process.env.FOLLOW_UP_FALLBACK_MODEL ||
      process.env.AI_FALLBACK_MODEL ||
      process.env.OPENROUTER_FALLBACK_MODEL,
    messages: buildFollowUpPrompt(lead, fallback),
    temperature: Number(process.env.FOLLOW_UP_TEMPERATURE || 0.2),
    maxTokens: Number(process.env.FOLLOW_UP_MAX_TOKENS || 1200),
    metadata: {
      agent: "follow-up-agent",
      purpose: "restaurant-reply-classification-next-action",
    },
  });

  return parseFollowUp(response.choices?.[0]?.message?.content || "", fallback);
}

function formatFollowUp(followUp) {
  return [
    `Restaurant Name: ${followUp.restaurantName}`,
    `Reply Text: ${followUp.replyText}`,
    `Classification: ${followUp.classification}`,
    `Recommended Action: ${followUp.recommendedAction}`,
    `Next Message: ${followUp.nextMessage}`,
    `Reminder Date: ${followUp.reminderDate}`,
    `Confidence: ${followUp.confidence}`,
    `Reason: ${followUp.reason}`,
  ].join("\n");
}

module.exports = {
  CLASSIFICATIONS,
  buildFallbackFollowUp,
  classifyFollowUpReply,
  formatFollowUp,
  replyText,
};
