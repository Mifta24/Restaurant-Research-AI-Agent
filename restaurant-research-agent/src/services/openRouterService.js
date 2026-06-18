const axios = require("axios");

const OPENROUTER_CHAT_COMPLETIONS_URL =
  process.env.OPENROUTER_BASE_URL ||
  "https://openrouter.ai/api/v1/chat/completions";

function parseAiContent(content) {
  try {
    return JSON.parse(content);
  } catch (_error) {
    return {
      aiSalesNotes: content,
      recommendedService: "Restaurant Digital Starter Package",
      outreachMessage: "",
    };
  }
}

function hasOpenRouterApiKey() {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

function openRouterHeaders() {
  const headers = {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
  };

  if (process.env.OPENROUTER_HTTP_REFERER) {
    headers["HTTP-Referer"] = process.env.OPENROUTER_HTTP_REFERER;
  }

  if (process.env.OPENROUTER_APP_TITLE) {
    headers["X-Title"] = process.env.OPENROUTER_APP_TITLE;
  }

  return headers;
}

async function requestChatCompletion({
  messages,
  model,
  fallbackModel,
  temperature = 0.4,
  maxTokens,
  metadata,
}) {
  if (!hasOpenRouterApiKey()) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }

  const selectedModel = model || process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
  const backupModel = fallbackModel || process.env.OPENROUTER_FALLBACK_MODEL || "";
  const body = {
    model: selectedModel,
    messages,
    temperature,
  };

  if (maxTokens) {
    body.max_tokens = Number(maxTokens);
  }

  if (metadata) {
    body.metadata = metadata;
  }

  try {
    const response = await axios.post(OPENROUTER_CHAT_COMPLETIONS_URL, body, {
      headers: openRouterHeaders(),
      timeout: Number(process.env.OPENROUTER_TIMEOUT_MS || 45000),
    });

    return {
      ...response.data,
      modelUsed: selectedModel,
      fallbackUsed: false,
    };
  } catch (error) {
    if (!backupModel || backupModel === selectedModel) {
      throw error;
    }

    console.warn(
      `OpenRouter primary model failed (${selectedModel}); retrying with fallback ${backupModel}.`,
    );

    const response = await axios.post(
      OPENROUTER_CHAT_COMPLETIONS_URL,
      {
        ...body,
        model: backupModel,
      },
      {
        headers: openRouterHeaders(),
        timeout: Number(process.env.OPENROUTER_TIMEOUT_MS || 45000),
      },
    );

    return {
      ...response.data,
      modelUsed: backupModel,
      fallbackUsed: true,
    };
  }
}

async function generateSalesNotes(lead) {
  if (!hasOpenRouterApiKey()) {
    return {
      aiSalesNotes: "",
      recommendedService: "Restaurant Digital Starter Package",
      outreachMessage: "",
    };
  }

  const response = await requestChatCompletion({
    model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
    fallbackModel: process.env.OPENROUTER_FALLBACK_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You create concise B2B sales notes for Indonesian restaurants. Return strict JSON only.",
      },
      {
        role: "user",
        content: JSON.stringify({
          instruction:
            "Create AI Sales Notes, Recommended Service, and a short WhatsApp outreach message. Offer only Restaurant Digital Starter Package, not a full AI chatbot.",
          lead,
          expectedJsonKeys: [
            "aiSalesNotes",
            "recommendedService",
            "outreachMessage",
          ],
        }),
      },
    ],
    temperature: 0.4,
    metadata: {
      agent: "restaurant-research-agent",
      purpose: "priority-a-sales-notes",
    },
  });

  const content = response.choices?.[0]?.message?.content || "";
  return parseAiContent(content);
}

module.exports = {
  generateSalesNotes,
  hasOpenRouterApiKey,
  requestChatCompletion,
};
