require("dotenv").config();

const {
  diagnoseRestaurant,
  formatDiagnosis,
} = require("./services/diagnosisService");

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
  source: "Manual Test",
};

diagnoseRestaurant(dummyLead)
  .then((diagnosis) => {
    console.log(formatDiagnosis(diagnosis));
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
