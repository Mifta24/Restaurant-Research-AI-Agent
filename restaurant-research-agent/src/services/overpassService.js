const axios = require("axios");

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://z.overpass-api.de/api/interpreter",
];

function buildQuery(target) {
  const { south, west, north, east } = target.bbox;
  return `
    [out:json][timeout:25];
    (
      node["amenity"~"restaurant|cafe|fast_food"](${south},${west},${north},${east});
      way["amenity"~"restaurant|cafe|fast_food"](${south},${west},${north},${east});
      relation["amenity"~"restaurant|cafe|fast_food"](${south},${west},${north},${east});
    );
    out center tags;
  `;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchRestaurantsForTarget(target) {
  let lastError;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await axios.post(endpoint, buildQuery(target), {
        headers: {
          "Content-Type": "text/plain",
          "User-Agent": "FTS Restaurant Research Agent/1.0",
        },
        timeout: 45000,
      });

      return (response.data.elements || []).map((element) => ({
        ...element,
        targetArea: target.name,
        cityArea: target.cityArea,
      }));
    } catch (error) {
      lastError = error;
      await wait(1500);
    }
  }

  throw lastError;
}

async function fetchJakartaRestaurants(targets) {
  const batches = [];

  for (const [index, target] of targets.entries()) {
    console.log(`[${index + 1}/${targets.length}] Fetching ${target.name} (${target.cityArea})...`);
    const restaurants = await fetchRestaurantsForTarget(target);
    console.log(`  -> found ${restaurants.length} places in ${target.name}`);
    batches.push(...restaurants);
  }

  return batches;
}

module.exports = {
  fetchJakartaRestaurants,
};
