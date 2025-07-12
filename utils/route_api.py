from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import json
from pathlib import Path
import requests
import csv
import re


# Load environment variables
load_dotenv()
API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

print("🔑 Loaded Google API key:", API_KEY[:8] + "..." if API_KEY else "❌ Not found")

app = Flask(__name__)
CORS(app)

SUGGESTED_PATH = Path(__file__).resolve().parent.parent / "data" / "suggested_routes.json"
AGENCY_CSV_PATH = Path(__file__).resolve().parent.parent / "data" / "booking.csv"

def load_agency_links():
    agency_links = {}
    if not AGENCY_CSV_PATH.exists():
        print(f"⚠️ booking.csv not found at: {AGENCY_CSV_PATH}")
        return agency_links

    with open(AGENCY_CSV_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            key = row["agency"].strip().lower()
            agency_links[key] = {
                "primary": row["primary_link"].strip(),
                "alternatives": [url.strip() for url in row["alt_links"].split(",") if url.strip()]
            }
    return agency_links



def save_suggested_legs(from_city, to_city, steps):
    entries = []
    agency_links = load_agency_links()

    for step in steps:
        transit = step.get("transit_details")
        if not transit:
            continue  # Skip walking steps

        agency_name = ""
        info_links = []

        # 1. Extract from Google agency data
        if transit.get("line", {}).get("agencies"):
            agency_obj = transit["line"]["agencies"][0]
            agency_name = agency_obj.get("name", "").strip().lower()
            if agency_obj.get("url"):
                info_links.append(agency_obj["url"])

        # 2. Fallback to booking.csv
        fallback = agency_links.get(agency_name)
        if fallback:
            info_links.append(fallback["primary"])
            info_links.extend(fallback["alternatives"])
        else:
            if agency_name:
                print(f"⚠️ Missing agency in CSV: '{agency_name}'")

        # 3. Final cleanup
        info_links = list(set(filter(None, info_links)))  # dedupe, clean

        entry = {
            "from": transit["departure_stop"]["name"],
            "to": transit["arrival_stop"]["name"],
            "mode": transit["line"]["vehicle"]["type"],
            "notes": transit.get("headsign", "Live Google step"),
            "details": transit["line"].get("name", ""),
            "info_links": info_links,
            "journey": "GoogleAuto",
            "leg": "auto"
        }
        entries.append(entry)

    if not entries:
        return

    # Load existing suggestions
    if SUGGESTED_PATH.exists():
        with open(SUGGESTED_PATH, "r", encoding="utf-8") as f:
            existing = json.load(f)
    else:
        existing = []

    # Add non-duplicate entries
    for entry in entries:
        if not any(e["from"] == entry["from"] and e["to"] == entry["to"] for e in existing):
            existing.append(entry)

    # Save updated file
    SUGGESTED_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(SUGGESTED_PATH, "w", encoding="utf-8") as f:
        json.dump(existing, f, indent=2)


@app.route("/api/live-route", methods=["GET"])
def live_route():
    origin = request.args.get("origin")
    destination = request.args.get("destination")
    if not origin or not destination:
        return jsonify({"error": "Missing origin or destination"}), 400

    url = "https://maps.googleapis.com/maps/api/directions/json"
    params = {
        "origin": origin,
        "destination": destination,
        "mode": "transit",
        "key": API_KEY
    }

    try:
        r = requests.get(url, params=params, timeout=10)
        data = r.json()

        if data.get("status") == "OK":
            steps = data["routes"][0]["legs"][0]["steps"]
            save_suggested_legs(origin, destination, steps)

        return jsonify(data)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/suggested")
def get_suggested():
    from_city = request.args.get("from")
    to_city = request.args.get("to")
    if not from_city or not to_city:
        return jsonify([])

    if not SUGGESTED_PATH.exists():
        return jsonify([])

    with open(SUGGESTED_PATH, "r", encoding="utf-8") as f:
        entries = json.load(f)

    matched = [e for e in entries if e["from"] == from_city and e["to"] == to_city]
    return jsonify(matched)




def load_agency_links():
    agency_links = {}
    if not AGENCY_CSV_PATH.exists():
        print(f"⚠️ booking.csv not found at: {AGENCY_CSV_PATH}")
        return agency_links

    with open(AGENCY_CSV_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            key = row["agency"].strip().lower()
            agency_links[key] = {
                "primary": row["primary_link"].strip(),
                "alternatives": [url.strip() for url in row["alt_links"].split(",") if url.strip()]
            }
    return agency_links
    
    

    

CITY_COORDS_PATH = Path(__file__).resolve().parent.parent / "data" / "city_coordinates.json"
SUGGESTED_PATH = Path(__file__).resolve().parent.parent / "data" / "suggested_routes.json"

def normalize_city(name):
    name = name.strip()
    known_aliases = {
        "Barcelona Bus Station North": "Barcelona",
        "Barcelona-Sants": "Barcelona",
        "Barcelone-Arc de Triomf": "Barcelona"
    }
    if name in known_aliases:
        return known_aliases[name]
    match = re.match(r"(.*?)(?:\s+Bus Station.*|[\-,].*)?$", name, re.IGNORECASE)
    return match.group(1).strip() if match else name

@app.route("/api/all-cities")
def all_cities():
    cities = set()

    # city_coordinates.json
    if CITY_COORDS_PATH.exists():
        with open(CITY_COORDS_PATH, "r", encoding="utf-8") as f:
            coords = json.load(f)
            for city in coords:
                cities.add(city.strip())

    # suggested_routes.json
    if SUGGESTED_PATH.exists():
        with open(SUGGESTED_PATH, "r", encoding="utf-8") as f:
            routes = json.load(f)
            for entry in routes:
                cities.add(normalize_city(entry["from"]))
                cities.add(normalize_city(entry["to"]))

    return jsonify(sorted(list(cities)))

@app.route("/api/geocode")
def geocode_city():
    city = request.args.get("q")
    if not city:
        return jsonify({"error": "Missing q"}), 400

    try:
        url = f"https://nominatim.openstreetmap.org/search"
        params = {
            "q": city,
            "format": "json",
            "limit": 1
        }
        r = requests.get(url, params=params, timeout=5, headers={"User-Agent": "slw.travel/1.0"})
        data = r.json()
        if not data:
            return jsonify({"error": "Not found"}), 404
        first = data[0]
        return jsonify({
            "lat": first["lat"],
            "lon": first["lon"]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500





if __name__ == "__main__":
    app.run(host="localhost", port=5001, debug=True)

