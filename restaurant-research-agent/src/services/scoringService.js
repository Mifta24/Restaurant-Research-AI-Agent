function scoreLead(lead) {
  let score = 0;

  if (lead.restaurantName) score += 2;
  if (lead.phoneWhatsapp) score += 3;
  if (lead.locationClear === "Yes") score += 2;
  if (lead.websiteStatus === "Missing") score += 3;
  if (lead.websiteStatus === "Weak") score += 2;
  if (["Restaurant", "Cafe", "Fast Food"].includes(lead.category)) score += 1;
  if (lead.jakartaArea) score += 1;

  return score;
}

function priorityFromScore(score, lead = {}) {
  const isReachable = Boolean(lead.phoneWhatsapp);

  if (score >= 8 && isReachable) return "Priority A";
  if (score >= 5) return "Priority B";
  return "Priority C";
}

function applyScoring(lead) {
  const salesOpportunityScore = scoreLead(lead);
  return {
    ...lead,
    salesOpportunityScore,
    priority: priorityFromScore(salesOpportunityScore, lead),
  };
}

module.exports = {
  applyScoring,
  priorityFromScore,
  scoreLead,
};
