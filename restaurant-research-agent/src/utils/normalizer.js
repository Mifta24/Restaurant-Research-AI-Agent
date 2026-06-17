function tagValue(tags, keys) {
  for (const key of keys) {
    if (tags[key]) return String(tags[key]).trim();
  }
  return "";
}

function categoryFromAmenity(amenity) {
  if (amenity === "cafe") return "Cafe";
  if (amenity === "fast_food") return "Fast Food";
  return "Restaurant";
}

function websiteStatus(url) {
  if (!url) return "Missing";
  const lowered = url.toLowerCase();
  if (
    lowered.includes("linktr.ee") ||
    lowered.includes("instagram.com") ||
    lowered.includes("facebook.com") ||
    lowered.includes("wa.me")
  ) {
    return "Weak";
  }
  return "Found";
}

function sourceUrl(element) {
  return `https://www.openstreetmap.org/${element.type}/${element.id}`;
}

function normalizeElement(element) {
  const tags = element.tags || {};
  const latitude = element.lat || element.center?.lat || "";
  const longitude = element.lon || element.center?.lon || "";
  const website = tagValue(tags, ["website", "contact:website", "url"]);
  const phone = tagValue(tags, ["phone", "contact:phone", "mobile", "contact:mobile"]);
  const restaurantName = tagValue(tags, ["name", "brand"]);
  const instagram = tagValue(tags, ["contact:instagram", "instagram"]);

  return {
    createdAt: new Date().toISOString(),
    leadId: `osm-${element.type}-${element.id}`,
    restaurantName,
    jakartaArea: element.cityArea,
    researchArea: element.targetArea,
    category: categoryFromAmenity(tags.amenity),
    latitude,
    longitude,
    phoneWhatsapp: phone,
    websiteStatus: websiteStatus(website),
    websiteUrl: website,
    instagram: instagram || "Need Check",
    source: "OpenStreetMap",
    locationClear: latitude && longitude ? "Yes" : "No",
    manualCheck: "No",
    manualCheckNotes: "",
    aiSalesNotes: "",
    recommendedService: "Restaurant Digital Starter Package",
    outreachMessage: "",
    outreachStatus: "Not Contacted",
    leadStatus: "New",
    lastContactDate: "",
    nextFollowUpDate: "",
    replyNotes: "",
    sourceUrl: sourceUrl(element),
  };
}

function dedupeLeads(leads) {
  const seen = new Set();
  const result = [];

  for (const lead of leads) {
    const key = lead.leadId || `${lead.restaurantName}-${lead.latitude}-${lead.longitude}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(lead);
  }

  return result;
}

module.exports = {
  dedupeLeads,
  normalizeElement,
};
