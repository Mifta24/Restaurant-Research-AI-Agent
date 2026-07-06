const axios = require("axios");

const DEFAULT_OPENROUTER_CHAT_COMPLETIONS_URL =
  "https://openrouter.ai/api/v1/chat/completions";

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function resolveChatCompletionsUrl() {
  const configuredUrl =
    process.env.AI_CHAT_COMPLETIONS_URL ||
    process.env.AI_BASE_URL ||
    process.env.OPENROUTER_BASE_URL ||
    DEFAULT_OPENROUTER_CHAT_COMPLETIONS_URL;
  const normalizedUrl = trimTrailingSlash(configuredUrl);

  if (normalizedUrl.endsWith("/chat/completions")) {
    return normalizedUrl;
  }

  if (normalizedUrl.endsWith("/v1")) {
    return `${normalizedUrl}/chat/completions`;
  }

  return `${normalizedUrl}/v1/chat/completions`;
}

function resolveApiKey() {
  return process.env.AI_API_KEY || process.env.OPENROUTER_API_KEY || "";
}

function isLocalProviderUrl(url) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/i.test(
    url,
  );
}

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
  const chatCompletionsUrl = resolveChatCompletionsUrl();
  return Boolean(resolveApiKey()) || isLocalProviderUrl(chatCompletionsUrl);
}

function openRouterHeaders() {
  const headers = {
    "Content-Type": "application/json",
  };
  const apiKey = resolveApiKey();

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

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
    throw new Error("AI_API_KEY or OPENROUTER_API_KEY is not configured.");
  }

  const chatCompletionsUrl = resolveChatCompletionsUrl();
  const selectedModel =
    model ||
    process.env.AI_MODEL ||
    process.env.OPENROUTER_MODEL ||
    "openai/gpt-4o-mini";
  const backupModel =
    fallbackModel ||
    process.env.AI_FALLBACK_MODEL ||
    process.env.OPENROUTER_FALLBACK_MODEL ||
    "";
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
    const response = await axios.post(chatCompletionsUrl, body, {
      headers: openRouterHeaders(),
      timeout: Number(
        process.env.AI_TIMEOUT_MS || process.env.OPENROUTER_TIMEOUT_MS || 45000,
      ),
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
      `AI primary model failed (${selectedModel}); retrying with fallback ${backupModel}.`,
    );

    const response = await axios.post(
      chatCompletionsUrl,
      {
        ...body,
        model: backupModel,
      },
      {
        headers: openRouterHeaders(),
        timeout: Number(
          process.env.AI_TIMEOUT_MS ||
            process.env.OPENROUTER_TIMEOUT_MS ||
            45000,
        ),
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
    model:
      process.env.AI_MODEL ||
      process.env.OPENROUTER_MODEL ||
      "openai/gpt-4o-mini",
    fallbackModel:
      process.env.AI_FALLBACK_MODEL || process.env.OPENROUTER_FALLBACK_MODEL,
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
  resolveChatCompletionsUrl,
};
