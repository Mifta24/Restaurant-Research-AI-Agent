require("dotenv").config();

const {
  classifyFollowUpReply,
  formatFollowUp,
} = require("./services/followUpService");

const args = process.argv.slice(2);
const reply = args.join(" ") || "Boleh, kirim detailnya.";

const dummyLead = {
  createdAt: new Date().toISOString(),
  leadId: `dummy-follow-up-${Date.now()}`,
  restaurantName: "Dummy Jakarta Restaurant",
  jakartaArea: "Jakarta Selatan",
  researchArea: "Kemang",
  category: "Restaurant",
  phoneWhatsapp: "+6281234567890",
  websiteStatus: "Missing",
  websiteUrl: "",
  instagram: "Need Check",
  locationClear: "Yes",
  salesOpportunityScore: 12,
  priority: "Priority A",
  recommendedService: "Basic",
  replyNotes: reply,
  lastContactDate: new Date().toISOString().slice(0, 10),
  salesMessages: {
    restaurantName: "Dummy Jakarta Restaurant",
    recommendedFtsService: "Basic",
    whatsappId:
      "Halo Dummy Jakarta Restaurant, saya dari FTS AI. Kami bisa bantu membuat website sederhana yang menampilkan menu, lokasi, dan tombol WhatsApp atau reservasi.",
  },
};

classifyFollowUpReply(dummyLead)
  .then((followUp) => {
    console.log(formatFollowUp(followUp));
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
