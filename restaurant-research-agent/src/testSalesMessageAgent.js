require("dotenv").config();

const {
  generateSalesMessages,
  formatSalesMessages,
} = require("./services/salesMessageService");

const dummyLead = {
  restaurantName: process.argv.slice(2).join(" ") || "Dummy Jakarta Restaurant",
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
  source: "Manual Test",
  diagnosis: {
    restaurantName: process.argv.slice(2).join(" ") || "Dummy Jakarta Restaurant",
    currentSituation:
      "Website: Missing. Instagram: Need Check. WhatsApp/contact: Found. Location: Clear.",
    mainProblem:
      "Restaurant does not have a clear owned website in the collected data.",
    improvementSuggestion:
      "Start with a simple professional landing page or website that shows menu highlights, location, and WhatsApp contact clearly.",
    recommendedFtsService: "Basic",
    priority: "Priority A",
  },
};

generateSalesMessages(dummyLead)
  .then((messages) => {
    console.log(formatSalesMessages(messages));
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
