const axios = require("axios");

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

async function generateSalesNotes(lead) {
  if (!process.env.OPENROUTER_API_KEY) {
    return {
      aiSalesNotes: "",
      recommendedService: "Restaurant Digital Starter Package",
      outreachMessage: "",
    };
  }

  const response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
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
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 45000,
    },
  );

  const content = response.data.choices?.[0]?.message?.content || "";
  return parseAiContent(content);
}

module.exports = {
  generateSalesNotes,
};
