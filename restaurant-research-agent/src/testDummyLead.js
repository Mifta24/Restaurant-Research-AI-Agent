require("dotenv").config();

const { postLeadsToSheet } = require("./services/googleSheetService");

const dummyLead = {
  createdAt: new Date().toISOString(),
  leadId: `dummy-${Date.now()}`,
  restaurantName: "Dummy Jakarta Restaurant",
  jakartaArea: "Jakarta Selatan",
  researchArea: "Kemang",
  category: "Restaurant",
  latitude: -6.2601,
  longitude: 106.8161,
  phoneWhatsapp: "+6281234567890",
  websiteStatus: "Missing",
  websiteUrl: "",
  instagram: "Need Check",
  source: "Manual Test",
  locationClear: "Yes",
  salesOpportunityScore: 12,
  priority: "Priority A",
  manualCheck: "No",
  manualCheckNotes: "Dummy webhook test lead.",
  aiSalesNotes: "Good starter package candidate. Needs basic web presence.",
  recommendedService: "Restaurant Digital Starter Package",
  outreachMessage:
    "Halo Dummy Jakarta Restaurant, kami bantu restoran memperbaiki landing page, menu online, dan tombol WhatsApp agar lebih mudah dihubungi pelanggan.",
  outreachStatus: "Not Contacted",
  leadStatus: "New",
  lastContactDate: "",
  nextFollowUpDate: "",
  replyNotes: "",
  sourceUrl: "https://example.com/dummy-lead",
};

postLeadsToSheet([dummyLead])
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
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
    } else {
      console.error(error.message || error);
    }
    process.exit(1);
  });
