const TARGET_AREAS = [
  {
    name: "Kemang",
    cityArea: "Jakarta Selatan",
    bbox: {
      south: -6.2765,
      west: 106.805,
      north: -6.2475,
      east: 106.829,
    },
  },
  {
    name: "Senopati",
    cityArea: "Jakarta Selatan",
    bbox: {
      south: -6.234,
      west: 106.797,
      north: -6.216,
      east: 106.816,
    },
  },
  {
    name: "SCBD",
    cityArea: "Jakarta Selatan",
    bbox: {
      south: -6.231,
      west: 106.804,
      north: -6.216,
      east: 106.815,
    },
  },
  {
    name: "PIK",
    cityArea: "Jakarta Utara",
    bbox: {
      south: -6.126,
      west: 106.72,
      north: -6.09,
      east: 106.765,
    },
  },
  {
    name: "Kelapa Gading",
    cityArea: "Jakarta Utara",
    bbox: {
      south: -6.18,
      west: 106.885,
      north: -6.135,
      east: 106.925,
    },
  },
  {
    name: "Menteng",
    cityArea: "Jakarta Pusat",
    bbox: {
      south: -6.21,
      west: 106.815,
      north: -6.18,
      east: 106.845,
    },
  },
];

function selectedTargets() {
  const requested = (process.env.TARGET_AREAS || "")
    .split(",")
    .map((area) => area.trim().toLowerCase())
    .filter(Boolean);

  if (requested.length === 0) {
    return TARGET_AREAS;
  }

  return TARGET_AREAS.filter((target) =>
    requested.includes(target.name.toLowerCase()),
  );
}

module.exports = {
  TARGET_AREAS,
  selectedTargets,
};
