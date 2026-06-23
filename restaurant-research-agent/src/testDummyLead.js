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
  lastContactDate: new Date().toISOString().slice(0, 10),
  nextFollowUpDate: "",
  replyNotes: "Boleh, kirim detailnya.",
  sourceUrl: "https://example.com/dummy-lead",
  diagnosis: {
    restaurantName: "Dummy Jakarta Restaurant",
    currentSituation:
      "Website: Missing. Instagram: Need Check. WhatsApp/contact: Found. Location: Clear.",
    mainProblem:
      "Restaurant does not have a clear owned website in the collected data.",
    improvementSuggestion:
      "Start with a simple professional landing page or website that shows menu highlights, location, and WhatsApp contact clearly.",
    recommendedFtsService: "Basic",
    priority: "Priority A",
  },
  salesMessages: {
    restaurantName: "Dummy Jakarta Restaurant",
    recommendedFtsService: "Basic",
    personalizationSignal:
      "Restaurant does not have a clear owned website in the collected data.",
    outreachAngle:
      "Professional, helpful outreach focused on improving the restaurant's online customer journey.",
    whatsappId:
      "Halo Dummy Jakarta Restaurant, saya dari FTS AI. Kami melihat restoran Anda sudah punya profil lokasi online, tetapi belum terlihat punya website resmi yang rapi. Kami bisa bantu membuat website sederhana yang menampilkan menu, lokasi, dan tombol WhatsApp atau reservasi supaya calon customer lebih mudah melihat info penting.",
    instagramDmId:
      "Halo Dummy Jakarta Restaurant, izin kenalan. Kami membantu restoran merapikan tampilan online seperti menu, lokasi, dan jalur WhatsApp/reservasi agar calon customer lebih mudah mengambil keputusan.",
    emailSubjectId: "Ide merapikan sistem online untuk Dummy Jakarta Restaurant",
    emailBodyId:
      "Halo tim Dummy Jakarta Restaurant,\n\nKami dari FTS AI membantu restoran membuat website sederhana yang menampilkan menu, lokasi, dan tombol WhatsApp atau reservasi.\n\nJika berkenan, kami bisa kirimkan contoh konsep singkat.",
    whatsappEn:
      "Hi Dummy Jakarta Restaurant, this is FTS AI. We noticed that your restaurant has an online location presence, but we did not see a clear official website. We help restaurants build a simple website that shows the menu, location, and WhatsApp or reservation button.",
    instagramDmEn:
      "Hi Dummy Jakarta Restaurant, nice to connect. We help restaurants organize their online menu, location, and WhatsApp/reservation path so customers can decide more easily.",
    emailSubjectEn:
      "Idea to improve Dummy Jakarta Restaurant's online customer journey",
    emailBodyEn:
      "Hi Dummy Jakarta Restaurant team,\n\nWe are FTS AI, and we help restaurants build a simple website that shows the menu, location, and WhatsApp or reservation button.\n\nIf helpful, we can send a short concept tailored to your current online presence.",
  },
  followUp: {
    restaurantName: "Dummy Jakarta Restaurant",
    replyText: "Boleh, kirim detailnya.",
    classification: "Interested",
    recommendedAction:
      "Send the most relevant package explanation and offer a meeting.",
    nextMessage:
      "Terima kasih, tim Dummy Jakarta Restaurant. Saya kirimkan detail paket Basic yang relevan untuk kondisi Dummy Jakarta Restaurant, termasuk opsi setup website, WhatsApp/reservasi, dan dukungan AI sesuai kebutuhan.",
    reminderDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10),
    confidence: "High",
    reason:
      "The reply asks for more detail, which indicates interest.",
  },
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
