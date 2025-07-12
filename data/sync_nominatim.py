import requests
import json
import os
from datetime import datetime

COORDS_FILE = "city_coordinates.json"
SYNCED_FILE = "external_city_matches.json"

# Load city cache
def load_json(path):
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

city_coords = load_json(COORDS_FILE)
external_matches = load_json(SYNCED_FILE)

def nominatim_lookup(city):
    print(f"🌍 Looking up {city} via Nominatim...")
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": city,
        "format": "json",
        "limit": 1
    }
    headers = {"User-Agent": "OverlandRouteExplorer/1.0"}
    try:
        r = requests.get(url, params=params, headers=headers, timeout=10)
        data = r.json()
        if data:
            return [float(data[0]["lat"]), float(data[0]["lon"])]
    except Exception as e:
        print(f"❌ Failed for {city}: {e}")
    return None

# Example: list of cities we might want to lookup periodically
cities_to_sync = ["Varanasi", "Cusco", "Luang Prabang", "Zanzibar"]

for city in cities_to_sync:
    if city in city_coords or city in external_matches:
        continue  # already known

    coords = nominatim_lookup(city)
    if coords:
        external_matches[city] = {
            "coords": coords,
            "source": "nominatim",
            "synced_at": datetime.utcnow().isoformat()
        }

# Save updated external matches
with open(SYNCED_FILE, "w", encoding="utf-8") as f:
    json.dump(external_matches, f, indent=2)

print("✅ Sync complete.")
print(f"🗂️ New cities added: {len(external_matches)}")
