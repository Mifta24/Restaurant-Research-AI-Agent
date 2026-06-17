const axios = require("axios");

async function postLeadsToSheet(leads) {
  if (!process.env.GOOGLE_SHEET_WEBHOOK_URL) {
    throw new Error("GOOGLE_SHEET_WEBHOOK_URL is not configured.");
  }

  const response = await axios.post(
    process.env.GOOGLE_SHEET_WEBHOOK_URL,
    {
      secret: process.env.GOOGLE_SHEET_WEBHOOK_SECRET,
      leads,
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 45000,
    },
  );

  return response.data;
}

module.exports = {
  postLeadsToSheet,
};
