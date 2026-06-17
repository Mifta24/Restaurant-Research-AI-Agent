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
  {
    name: "Puri Indah",
    cityArea: "Jakarta Barat",
    bbox: {
      south: -6.2,
      west: 106.725,
      north: -6.174,
      east: 106.751,
    },
  },
  {
    name: "Kebon Jeruk",
    cityArea: "Jakarta Barat",
    bbox: {
      south: -6.208,
      west: 106.754,
      north: -6.182,
      east: 106.78,
    },
  },
  {
    name: "Cawang",
    cityArea: "Jakarta Timur",
    bbox: {
      south: -6.256,
      west: 106.856,
      north: -6.23,
      east: 106.882,
    },
  },
  {
    name: "Pulogadung",
    cityArea: "Jakarta Timur",
    bbox: {
      south: -6.203,
      west: 106.893,
      north: -6.177,
      east: 106.919,
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
