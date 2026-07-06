require("dotenv").config();

const {
  formatLeadResearch,
  researchLead,
} = require("./services/leadResearchService");

const restaurantName = process.argv.slice(2).join(" ") || "Dummy Jakarta Restaurant";

const dummyLead = {
  createdAt: new Date().toISOString(),
  leadId: `dummy-lead-research-${Date.now()}`,
  restaurantName,
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
};

researchLead(dummyLead)
  .then((research) => {
    console.log(formatLeadResearch(research));
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
