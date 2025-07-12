import pandas as pd
import json
import os
import time
import requests
from dotenv import load_dotenv
nodes = set()
edges = []

# Load .env file for OpenCage API key
load_dotenv()
API_KEY = os.getenv("OPENCAGE_API_KEY")

if not API_KEY:
    raise ValueError("❌ OpenCage API key not found. Add OPENCAGE_API_KEY to your .env file.")

# Load the CSV
csv_path = "SlowTravel_Routes.csv"
try:
    df = pd.read_csv(csv_path, encoding="utf-8")
except UnicodeDecodeError:
    df = pd.read_csv(csv_path, encoding="ISO-8859-1")

df = df.fillna("").astype(str)

# Extract cities and edges
edges = []
cities = set()

for _, row in df.iterrows():
    from_city = row["From"].strip()
    to_city = row["To"].strip()

    # ✅ Skip if either From or To is empty
    if not from_city or not to_city:
        continue

    cities.update([from_city, to_city])

    edges.append({
        "from": from_city,
        "to": to_city,
        "mode": row["Mode(s)"],
        "notes": row["Notes / Description"],
        "details": row["Train/Bus Details"],
        "info_link": row["Booking or Info Link"],
        "journey": row["Journey Name"],
        "leg": row["Leg #"]
    })

# Load or create coordinates cache
coord_path = "city_coordinates.json"
if os.path.exists(coord_path):
    with open(coord_path, "r", encoding="utf-8") as f:
        city_coords = json.load(f)
else:
    city_coords = {}

def geocode_city(city_name):
    print(f"🌍 Geocoding: {city_name}")
    url = "https://api.opencagedata.com/geocode/v1/json"
    params = {"q": city_name, "key": API_KEY, "limit": 1}
    try:
        res = requests.get(url, params=params)
        data = res.json()
        if data["results"]:
            coords = data["results"][0]["geometry"]
            return [coords["lat"], coords["lng"]]
    except Exception as e:
        print(f"❌ Failed to geocode {city_name}: {e}")
    return None

# Geocode missing cities
new_coords = 0
for city in sorted(cities):
    if city and city not in city_coords:
        coords = geocode_city(city)
        if coords:
            city_coords[city] = coords
            new_coords += 1
            time.sleep(1.1)  # Respect OpenCage free tier

# Save coordinates
with open(coord_path, "w", encoding="utf-8") as f:
    json.dump(city_coords, f, indent=2)

# Save graph
# Optional: Sort edges by Leg #
edges = sorted(edges, key=lambda x: str(x.get("leg", "")))

graph_data = {
    "nodes": sorted(list(nodes)),
    "edges": edges
}

with open("routes.json", "w", encoding="utf-8") as f:
    json.dump(graph_data, f, indent=2)

print(f"✅ Done! routes.json and city_coordinates.json created.")
print(f"🧭 Total cities: {len(cities)}, routes: {len(edges)}, new geocoded: {new_coords}")
