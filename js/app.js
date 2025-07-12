let graph = {};
let routes = [];
let cityCoordinates = {};
let map, routeLines = [];

// Load both routes and coordinates

window.addEventListener("DOMContentLoaded", async () => {
  await populateCityDropdowns(); 
  await loadData(); 
});

// Minimal polyline decoder (Google's encoded points)
function decodePolyline(encoded) {
  let index = 0, lat = 0, lng = 0, coordinates = [];

  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    coordinates.push([lat / 1e5, lng / 1e5]);
  }

  return coordinates;
}

async function loadData() {
	const [routeRes, coordRes, externalRes] = await Promise.all([
	  fetch("data/routes.json"),
	  fetch("data/city_coordinates.json"),
	  fetch("data/external_city_matches.json")
	]);

	const routeData = await routeRes.json();
	const coordsMain = await coordRes.json();
	const coordsExtra = await externalRes.json();

	cityCoordinates = { ...coordsMain, ...Object.fromEntries(
	  Object.entries(coordsExtra).map(([k, v]) => [k, v.coords])
	)};

  routes = routeData.edges;
	const citySet = new Set();
	routes.forEach(r => {
	citySet.add(r.from);
	citySet.add(r.to);
	});
	const cities = Array.from(citySet).sort();

  // ✅ Assign after variables are defined
  window.routes = routes;
  window.cities = cities;

	const cityNames  = Object.keys(cityCoordinates).sort();
	populateDropdowns(cityNames);
  buildGraph(routes);
  initMap();  // Initialize Leaflet
}

function populateDropdowns(cities) {
  const fromInput = document.getElementById("from");
  const toInput = document.getElementById("to");

  new Awesomplete(fromInput, { list: cities });
  new Awesomplete(toInput, { list: cities });
}

function buildGraph(routes) {
  graph = {}; // reset

  routes.forEach(route => {
    const from = route.from;
    const to = route.to;

    if (!graph[from]) graph[from] = [];

    graph[from].push({
      to,
      mode: route.mode,
      notes: route.notes,
      details: route.details,
      info_link: route.info_link,
      journey: route.journey
    });
  });
}
function bfsAllPaths(start, end, maxPaths = 3, maxDepth = 10) {
  const queue = [[start, []]];
  const results = [];

  while (queue.length > 0 && results.length < maxPaths) {
    const [currentCity, pathSoFar] = queue.shift();

    if (currentCity === end) {
      results.push(pathSoFar);
      continue;
    }

    if (pathSoFar.length >= maxDepth) continue;

    const neighbors = graph[currentCity] || [];
    for (const edge of neighbors) {
      if (!pathSoFar.some(step => step.from === edge.to || step.to === edge.to)) {
        queue.push([edge.to, [...pathSoFar, { from: currentCity, ...edge }]]);
      }
    }
  }

  return results;
}

async function findRoute() {
  const from = document.getElementById("from").value;
  const to = document.getElementById("to").value;

  if (!from || !to || from === to) {
    alert("Please select two different cities.");
    return;
  }

  // 🌐 Try fetching coordinates if city not already known
  if (!cityCoordinates[from]) {
    cityCoordinates[from] = await fetchCityFromNominatim(from);
  }
  if (!cityCoordinates[to]) {
    cityCoordinates[to] = await fetchCityFromNominatim(to);
  }

  // ❌ Still unknown after OSM? Block.
  if (!cityCoordinates[from] || !cityCoordinates[to]) {
    alert("Sorry, we couldn't locate one of the cities.");
    return;
  }

  const allRoutes = bfsAllPaths(from, to);
  const limitedRoutes = allRoutes.slice(0, 3); // ✅ limit to top 3

  if (limitedRoutes.length === 0) {
    const userConfirmed = confirm("No known overland route found. Search live transit route via Google Maps?");
    if (userConfirmed) {
      checkSuggestedRoute(from, to).then(cached => {
        if (cached) {
          console.log("✅ Using cached suggested route:", cached);
          showResult(cached);
        } else {
          fetchTransitRoute(from, to).then(result => {
            if (result) {
              showGoogleRouteOnMap(result.steps);
            } else {
              alert("No route found via Google either.");
            }
          });
        }
      });
    }
    return;
  }

  displayRoutes(limitedRoutes);
}

function showResult(path) {
  const resultDiv = document.getElementById("routeResults");
  resultDiv.innerHTML = "";

  if (!path || path.length === 0) {
    resultDiv.innerHTML = "<p>No overland path found 😢</p>";
    return;
  }

  resultDiv.innerHTML = `
    <h3>🧭 Route Found (Overland)</h3>
    <ol>${renderRouteSteps(path, "local")}</ol>
  `;

  plotPathOnMap(path);
}


function displayRoutes(paths) {
  const container = document.getElementById("routeResults");
  container.innerHTML = "";

  // 🧹 Clear previously drawn routes
  routeLines.forEach(layer => map.removeLayer(layer));
  routeLines = [];
  allRouteLayers = [];

  if (paths.length === 0) {
    container.innerHTML = "<p>No routes found 😢</p>";
    return;
  }

  const colors = ["#0077be", "#d95f02", "#1b9e77"];

  paths.forEach((path, index) => {
    const routeNum = `Route ${index + 1}`;
    const color = colors[index % colors.length];
    const routeLayers = plotPathOnMap(path, routeNum, color);

    allRouteLayers.push(routeLayers);  // Grouped layers
    routeLines.push(...routeLayers);  // For full cleanup

    // 🪪 UI card
    const routeCard = document.createElement("div");
    routeCard.className = "route-card";
    const modes = [...new Set(path.map(step => step.mode))].join(", ");
    const legList = path.map(step => {
      const badges = getBadges(step).join(" ");
      return `
        <li>
          <strong>${step.from} → ${step.to}</strong> via <em>${step.mode}</em> ${badges}<br>
          ${step.notes || ""}<br>
          ${step.details ? `<code>${step.details}</code>` : ""}
          ${step.info_link ? `<br><a href="https://${step.info_link}" target="_blank">${step.info_link}</a>` : ""}
        </li>
      `;
    }).join("");

    routeCard.innerHTML = `
      <h3>${routeNum}</h3>
      <p>${path.length} legs | Modes: ${modes}</p>
      <ul>${legList}</ul>
    `;

    const toggleBtn = document.createElement("button");
    toggleBtn.textContent = "Hide Route";
    let visible = true;
    toggleBtn.onclick = () => {
      visible = !visible;
      toggleBtn.textContent = visible ? "Hide Route" : "Show Route";
      routeLayers.forEach(layer => visible ? layer.addTo(map) : map.removeLayer(layer));
    };

    routeCard.appendChild(toggleBtn);
    container.appendChild(routeCard);
  });
}

loadData();

map, cityMarkers = {}, routeLines = [];

function initMap() {
	
	if (map) {
	console.warn("🛑 Map already initialized");
	return;  // ✅ Prevent double init
	}

  map = L.map('map').setView([30, 20], 3);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Add custom legend (already included in your code)
  const legend = L.control({ position: "bottomright" });
  legend.onAdd = function () {
    const div = L.DomUtil.create("div", "map-legend");
    div.innerHTML = `
      <strong>🧭 Route Legend</strong><br>
      <span style="color: blue;">&#9632;</span> Train<br>
      <span style="color: green;">&#9632;</span> Bus<br>
      <span style="color: purple;">&#9632;</span> Train + Bus<br>
      <span style="color: gray;">&#9632;</span> Ship / Ferry<br>
      <span style="color: orange; border-bottom: 2px dotted orange;">&nbsp;&nbsp;&nbsp;&nbsp;</span> Unknown / No Data
    `;
    return div;
  };
  legend.addTo(map);

  // ✅ Add city markers
  for (const [city, coords] of Object.entries(cityCoordinates)) {
    const marker = L.circleMarker(coords, {
      radius: 4,
      color: '#555',
      fillColor: '#ccc',
      fillOpacity: 0.8,
    }).bindTooltip(city, { permanent: false, direction: "top" });
    marker.addTo(map);
	marker.on("click", () => {
	  if (!window.selectedFromCity) {
		window.selectedFromCity = city;
		document.getElementById("from").value = city;
	  } else {
		document.getElementById("to").value = city;
		window.selectedFromCity = null;
		findRoute();  // Auto trigger
	  }
	});
  }
}


let allRouteLayers = []; 

function plotPathOnMap(path, label = "", colorOverride = null) {
  const latlngs = [];
  const layers = [];

  path.forEach(step => {
    const fromCoord = cityCoordinates[step.from] || [step.from.lat, step.from.lng];
    const toCoord = cityCoordinates[step.to] || [step.to.lat, step.to.lng];

	if (!fromCoord || !toCoord) {
	  // Try fuzzy fallback with geocoding
	  console.warn("🛑 Missing coordinates. Attempting geocode:", step.from, step.to);
	  return;  // Keep simple for now
	}

    latlngs.push(fromCoord);

    let color = "orange";
    let dashArray = "4 6";
    const mode = (step.mode || "").toLowerCase();

    if (mode.includes("train") && mode.includes("bus")) {
      color = "purple";
      dashArray = null;
    } else if (mode.includes("train")) {
      color = "blue";
      dashArray = null;
    } else if (mode.includes("bus")) {
      color = "green";
      dashArray = null;
    } else if (mode.includes("ship") || mode.includes("ferry")) {
      color = "gray";
      dashArray = null;
    }

    if (colorOverride) color = colorOverride;

	let linePoints;

	if (step.points) {
	  const decoded = decodePolyline(step.points);
	  linePoints = decoded.map(coord => [coord[0], coord[1]]);
	  console.log("✅ Decoded Google polyline:", linePoints.length, "points");
	} else {
	  linePoints = [fromCoord, toCoord];
	  console.warn("⚠️ No polyline — fallback to straight line");
	}

	if (!linePoints || !Array.isArray(linePoints) || linePoints.length < 2) {
	  console.warn("🛑 Invalid or empty linePoints for step:", step.from, "→", step.to);
	  return;
	}

	console.log("📍 Drawing line from", step.from, "to", step.to, "with", linePoints.length, "points");

	// ✅ Animate polyline
	let polyline;
	if (linePoints.length > 2) {
	  polyline = animatePolyline(linePoints, {
		color,
		weight: 5,
		opacity: 0.85,
		dashArray
	  });
	} else {
	  // 🔁 Skip animation for just 2 points
	  polyline = L.polyline(linePoints, {
		color,
		weight: 5,
		opacity: 0.85,
		dashArray
	  }).addTo(map);
	}

	layers.push(polyline);


    // 🏷 Midpoint icon + label
    const midCoord = [
      (linePoints[0][0] + linePoints[linePoints.length - 1][0]) / 2,
      (linePoints[0][1] + linePoints[linePoints.length - 1][1]) / 2
    ];

    const iconHTML = mode.includes("bus") ? "🚌"
      : mode.includes("train") ? "🚆"
      : mode.includes("ship") || mode.includes("ferry") ? "⛴️"
      : mode.includes("walk") ? "🚶" : "❓";

    const labelText = `${step.from} → ${step.to}`;
    const combinedLabel = `
      <div style="font-size:10px; display:inline-block; background:white; padding:2px; border-radius:4px;">
        ${iconHTML} ${labelText}
      </div>
    `;

    const combinedMarker = L.marker(midCoord, {
      icon: L.divIcon({
        className: 'city-label',
        html: combinedLabel
      })
    }).addTo(map);
	
    layers.push(combinedMarker);
  });

  // 🚩 Start marker and fit bounds
  if (latlngs.length > 0 && label) {
    const marker = L.marker(latlngs[0])
      .bindPopup(`<b>${label}</b>`)
      .openPopup()
      .addTo(map);
    layers.push(marker);
    map.fitBounds(latlngs, { padding: [50, 50] });
  }

  return layers;
}

function findAllRoutes(from, to, maxDepth = 10) {
  const results = [];
  const visited = new Set();

  function dfs(current, path, depth) {
    if (depth > maxDepth) return;
    if (current === to) {
      results.push([...path]);
      return;
    }

    visited.add(current);
    const nextSteps = routes.filter(r => r.from === current && !visited.has(r.to));
    for (let next of nextSteps) {
      path.push(next);
      dfs(next.to, path, depth + 1);
      path.pop();
    }
    visited.delete(current);
  }

  dfs(from, [], 0);
  return results;
}


function getBadges(leg) {
  const badges = [];
  if (leg.mode.includes("Train") && leg.journey.includes("Longest")) badges.push("🚆 Eco");
  if (leg.journey.includes("Queen Mary 2")) badges.push("🛳️ Historical");
  if ((leg.notes && leg.notes.toLowerCase().includes("scenic")) ||
      (leg.details && leg.details.toLowerCase().includes("view"))) {
    badges.push("🌄 Scenic");
  }
  return badges;
}

async function fetchTransitRoute(from, to) {
  const endpoint = `http://localhost:5001/api/live-route?origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}`;

  try {
    const res = await fetch(endpoint);
    const data = await res.json();

    if (data.status !== "OK") {
      console.error("❌ No transit route found:", data.status);
      return null;
    }

    const route = data.routes[0];
	const steps = route.legs[0].steps.map(step => ({
	  from: step.start_location,
	  to: step.end_location,
	  instructions: step.html_instructions,
	  mode: step.travel_mode,
	  points: step.polyline?.points || null,        // ✅ ADD THIS
	  transit: step.transit_details ?? {},
	  full: step
	}));



    return {
      summary: route.summary,
      steps
    };
  } catch (err) {
    console.error("❌ Error fetching transit route:", err);
    return null;
  }
}


function isOverlandStep(step) {
  if (!step.transit) return false;
  const mode = step.transit.line.vehicle.type.toLowerCase();
  return ["bus", "rail", "train", "subway", "tram", "ferry"].includes(mode);
}

function showGoogleRouteOnMap(steps) {
  // 🧹 Clear previous layers
  routeLines.forEach(layer => map.removeLayer(layer));
  routeLines = [];

  const latlngs = [];

  steps.forEach(step => {
    const from = [step.from.lat, step.from.lng];
    const to = [step.to.lat, step.to.lng];
    latlngs.push(from);

    let linePoints;

    if (step.points) {
      const decoded = decodePolyline(step.points);
      linePoints = decoded.map(coord => [coord[0], coord[1]]);
      console.log("✅ Google polyline:", linePoints.length, "points");
    } else if (isOverlandStep(step)) {
      const fromCity = Object.keys(cityCoordinates).find(city =>
        step.from && cityCoordinates[city][0] === step.from.lat &&
        cityCoordinates[city][1] === step.from.lng
      );
      const toCity = Object.keys(cityCoordinates).find(city =>
        step.to && cityCoordinates[city][0] === step.to.lat &&
        cityCoordinates[city][1] === step.to.lng
      );

		if (fromCity && toCity) {
		  const altRoute = bfsAllPaths(fromCity, toCity, 1)[0];
		  if (altRoute?.length > 0) {
			const substeps = altRoute.flatMap(r => {
			  if (r.points) {
				try {
				  const decoded = decodePolyline(r.points);
				  if (Array.isArray(decoded) && decoded.length > 0) {
					return decoded;
				  }
				} catch (e) {
				  console.warn("❌ Failed to decode polyline:", r.from, "→", r.to);
				}
			  }

			  const fromCoord = cityCoordinates[r.from];
			  const toCoord = cityCoordinates[r.to];

			  if (!fromCoord || !toCoord) {
				console.warn("🛑 Missing coordinates for", r.from, "or", r.to);
				return [];
			  }

			  return [fromCoord, toCoord];
			});

			linePoints = Array.isArray(substeps) ? substeps : [];
			console.log("🔄 Fallback to local geometry:", fromCity, "→", toCity, "| Points:", linePoints.length);
		  } else {
			linePoints = [from, to];
		  }
		} else {
		  linePoints = [from, to];
		}

    } else {
      linePoints = [from, to];
    }

    const color = step.mode === "TRANSIT" ? "blue" : "gray";

    const polyline = L.polyline(linePoints, {
      color,
      weight: 4,
      opacity: 0.8,
      dashArray: step.mode === "WALKING" ? "4 6" : null
    }).addTo(map);

    const label = step.transit?.line?.name
      ? `${step.transit.line.name}<br>${step.transit.headsign || ""}`
      : (step.transit?.headsign || step.instructions || step.mode || "Unknown");

    const labelMarker = L.marker(to, {
      icon: L.divIcon({
        className: 'city-label',
        html: `<div style="font-size:10px; background:white; padding:2px; border-radius:4px;">${label}</div>`
      })
    }).addTo(map);

    routeLines.push(polyline, labelMarker);
  });

  if (latlngs.length > 0) {
    map.fitBounds(latlngs);
  }

  const resultDiv = document.getElementById("routeResults");
  resultDiv.innerHTML = `
    <h3>🛰️ Route Found (via Google Transit)</h3>
    <ol>${renderRouteSteps(steps, "google")}</ol>
  `;

  // 🧠 Optional: Start marker
  if (steps.length > 0) {
    const start = [steps[0].from.lat, steps[0].from.lng];
    const marker = L.marker(start).bindPopup("<b>Live Route Start</b>").openPopup().addTo(map);
    routeLines.push(marker);
  }
}


function renderRouteSteps(steps, source = "local") {
  return steps.map((step, i) => {
    const from = source === "google"
      ? step.transit?.departure_stop?.name || "N/A"
      : step.from;

    const to = source === "google"
      ? step.transit?.arrival_stop?.name || "N/A"
      : step.to;

    const mode = source === "google"
      ? (step.transit?.line?.vehicle?.type || step.mode || "Unknown")
      : step.mode;

    const notes = source === "google"
      ? (step.transit?.headsign || step.instructions || "")
      : (step.notes || "");

    const details = source === "google"
      ? (step.transit?.line?.name || "")
      : (step.details || "");

    const agencyName = source === "google"
      ? step.transit?.line?.agencies?.[0]?.name || ""
      : "";

    const agencyUrl = source === "google"
      ? step.transit?.line?.agencies?.[0]?.url || ""
      : "";

    const fallbackSearch = `https://www.google.com/search?q=${encodeURIComponent(`${mode} ${from} to ${to} booking`)}`;
    const bookingLink = agencyUrl || fallbackSearch;

    const linkButton = (source === "google" && step.transit)
      ? `<a href="${bookingLink}" target="_blank" rel="noopener"><button>Book Now</button></a>`
      : "";

    return `
      <li>
        <strong>${from}</strong> → <strong>${to}</strong> (${mode})<br>
        <em>${notes}</em><br>
        ${details ? `<code>${details}</code><br>` : ""}
        ${linkButton}
      </li>
    `;
  }).join("");
}

async function checkSuggestedRoute(from, to) {
  const res = await fetch(`http://localhost:5001/api/suggested?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  const data = await res.json();
  return data && data.length > 0 ? data : null;
}

async function populateCityDropdowns() {
  try {
    const res = await fetch("http://localhost:5001/api/all-cities");
    const cities = await res.json();

    const fromInput = document.getElementById("from");
    const toInput = document.getElementById("to");

    // Attach Awesomplete dropdown
    fromInput.setAttribute("data-list", cities.join(","));
    toInput.setAttribute("data-list", cities.join(","));

    new Awesomplete(fromInput, {
      minChars: 1,
      maxItems: 10
    });

    new Awesomplete(toInput, {
      minChars: 1,
      maxItems: 10
    });

    console.log("✅ Autocomplete cities loaded:", cities.length);
  } catch (err) {
    console.error("❌ Failed to load autocomplete cities:", err);
  }
}

async function fetchCityFromNominatim(cityName) {
  const endpoint = `http://localhost:5001/api/geocode?q=${encodeURIComponent(cityName)}`;

  try {
    const res = await fetch(endpoint);
    const data = await res.json();

    if (data && data.lat && data.lon) {
      const coords = [parseFloat(data.lat), parseFloat(data.lon)];
      console.log(`🌍 Found ${cityName} via Nominatim:`, coords);
      return coords;
    } else {
      console.warn(`⚠️ City not found: ${cityName}`);
      return null;
    }
  } catch (err) {
    console.error("❌ Error fetching from Nominatim:", err);
    return null;
  }
}


function animatePolyline(points, options = {}, delay = 80) {
  let i = 1;
  const animatedLine = L.polyline([], options).addTo(map);

  const interval = setInterval(() => {
    if (i >= points.length) {
      clearInterval(interval);
    } else {
      animatedLine.addLatLng(points[i]);
      i++;
    }
  }, delay);

  return animatedLine;
}

function decodePolyline(str) {
	const coordinates = [];
	if (!str || typeof str !== "string") return coordinates;	
  let index = 0, lat = 0, lng = 0;

  while (index < str.length) {
    let b, shift = 0, result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const deltaLat = (result & 1 ? ~(result >> 1) : result >> 1);
    lat += deltaLat;

    shift = 0;
    result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const deltaLng = (result & 1 ? ~(result >> 1) : result >> 1);
    lng += deltaLng;

    coordinates.push([lat / 1e5, lng / 1e5]);
  }

  return coordinates;
}

