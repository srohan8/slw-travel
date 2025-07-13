from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import json
from pathlib import Path
import sys
sys.path.append(str(Path(__file__).resolve().parent.parent)) 
import requests
import csv
import re
from ai.openai_config import ask_openai
from booking_sites import load_booking_sites, append_booking_site
import sqlite3
from datetime import datetime
import traceback
from db import get_db

# Load environment variables
load_dotenv()
API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

print("🔑 Loaded Google API key:", API_KEY[:8] + "..." if API_KEY else "❌ Not found")

app = Flask(__name__, template_folder="../templates")
CORS(app)

SUGGESTED_PATH = Path(__file__).resolve().parent.parent / "data" / "suggested_routes.json"

DB_PATH = Path(__file__).resolve().parent.parent / "backend" / "travel_data.db"


def load_agency_links():
    db = get_db()
    rows = db.execute("""
        SELECT agency, primary_link, alt_links 
        FROM booking_sites 
        WHERE active = 'yes'
    """).fetchall()

    agency_links = {}
    for row in rows:
        key = row["agency"].strip().lower()
        agency_links[key] = {
            "primary": row["primary_link"].strip(),
            "alternatives": [
                url.strip() for url in (row["alt_links"] or "").split(",") if url.strip()
            ]
        }
    return agency_links

def save_suggested_legs(from_city, to_city, steps):
    entries = []
    agency_links = load_agency_links()

    for step in steps:
        transit = step.get("transit_details")
        if not transit:
            continue  # Skip non-transit steps

        agency_name = ""
        info_links = []

        # 1. Extract from Google agency data
        agency_obj = None
        if transit.get("line", {}).get("agencies"):
            agency_obj = transit["line"]["agencies"][0]
            agency_name = agency_obj.get("name", "").strip().lower()
            if agency_obj.get("url"):
                info_links.append(agency_obj["url"])

        # 2. Fallback to agency_links (from DB or CSV)
        db_links = agency_links.get(agency_name)
        if db_links:
            info_links.append(db_links["primary"])
            info_links.extend(db_links["alternatives"])

        # 3. Cleanup links
        info_links = list(set(filter(None, info_links)))  # dedupe + remove blanks

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

        # Save agency if present
        if agency_name and agency_obj and agency_obj.get("url"):
            insert_or_update_agency(agency_name, agency_obj["url"])

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

    # Save updated list
    SUGGESTED_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(SUGGESTED_PATH, "w", encoding="utf-8") as f:
        json.dump(existing, f, indent=2)

    print(f"💾 Saved {len(entries)} suggested legs")


def insert_or_update_agency(agency_name, url):
    if not agency_name or not url:
        return
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM booking_sites WHERE agency = ?", (agency_name,))
    if cursor.fetchone() is None:
        cursor.execute("""
            INSERT INTO booking_sites (agency, primary_link, active, last_seen)
            VALUES (?, ?, 'no', ?)
        """, (agency_name, url, datetime.utcnow().isoformat()))
        print(f"➕ Added new agency: {agency_name}")
    else:
        cursor.execute("""
            UPDATE booking_sites SET last_seen = ? WHERE agency = ?
        """, (datetime.utcnow().isoformat(), agency_name))
    conn.commit()
    conn.close()





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

# @app.route("/api/all-cities")
# def all_cities():
    # cities = set()

    # # city_coordinates.json
    # if CITY_COORDS_PATH.exists():
        # with open(CITY_COORDS_PATH, "r", encoding="utf-8") as f:
            # coords = json.load(f)
            # for city in coords:
                # cities.add(city.strip())

    # # suggested_routes.json
    # if SUGGESTED_PATH.exists():
        # with open(SUGGESTED_PATH, "r", encoding="utf-8") as f:
            # routes = json.load(f)
            # for entry in routes:
                # cities.add(normalize_city(entry["from"]))
                # cities.add(normalize_city(entry["to"]))

    # return jsonify(sorted(list(cities)))



@app.route("/api/geodb-cities")
def geodb_proxy_nominatim():
    query = request.args.get("q")
    if not query:
        return jsonify([])

    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": query,
        "format": "json",
        "limit": 10,
        "addressdetails": 1
    }

    try:
        r = requests.get(url, params=params, headers={"User-Agent": "slw.travel/1.0"})
        r.raise_for_status()
        data = r.json()

        seen = set()
        results = []

        for item in data:
            addr = item.get("address", {})
            city = addr.get("city") or addr.get("town") or addr.get("village") or addr.get("hamlet") or addr.get("municipality")
            country = addr.get("country")

            # Broader filter: include common types + some admin boundaries
            if not city or not country:
                continue

            key = (city.lower(), country.lower())
            if key in seen:
                continue

            seen.add(key)
            results.append({"city": city, "country": country})

        return jsonify(results)

    except Exception as e:
        print("❌ Nominatim error:", e)
        return jsonify({"error": str(e)}), 500

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

# ✅ Save to suggested_routes.json for caching
def append_ai_suggestions(legs):
    if not SUGGESTED_PATH.exists():
        existing = []
    else:
        with open(SUGGESTED_PATH, "r", encoding="utf-8") as f:
            existing = json.load(f)

    existing_pairs = {(e["from"], e["to"]) for e in existing}
    known_pairs = {(e["from"], e["to"]) for e in load_known_edges()}

    for leg in legs:
        key = (leg["from"], leg["to"])

        # Skip duplicates
        if key in existing_pairs:
            continue

        # Determine label + reporting origin
        if key in known_pairs and leg.get("journey") == "Known":
            leg["report_origin"] = "Matched known segment"
        elif leg.get("journey") == "GoogleAuto":
            leg["report_origin"] = "Imported from Google Maps"
        else:
            leg["journey"] = "AI-Simulated"
            leg["report_origin"] = "AI inference from OpenAI"

        leg["leg"] = leg.get("leg", "auto")
        existing.append(leg)

    with open(SUGGESTED_PATH, "w", encoding="utf-8") as f:
        json.dump(existing, f, indent=2)


ROUTES_PATH = Path(__file__).resolve().parent.parent / "data" / "routes.json"
SUGGESTED_PATH = Path(__file__).resolve().parent.parent / "data" / "suggested_routes.json"

def load_known_edges():
    known = []

    if ROUTES_PATH.exists():
        with open(ROUTES_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            known.extend(data.get("edges", []))

    if SUGGESTED_PATH.exists():
        with open(SUGGESTED_PATH, "r", encoding="utf-8") as f:
            known.extend(json.load(f))

    return known


def find_partial_hubs(origin, destination, all_edges):
    from_legs = [r for r in all_edges if r["from"].lower() == origin.lower()]
    to_legs = [r for r in all_edges if r["to"].lower() == destination.lower()]
    hubs = []

    for a in from_legs:
        for b in to_legs:
            if a["to"].lower() == b["from"].lower():
                hubs.append((a, b))  # A → B → D

    return hubs

@app.route("/api/ai-plan")
def ai_route_plan():
    origin = request.args.get("from")
    destination = request.args.get("to")

    if not origin or not destination:
        return jsonify({"error": "Missing from/to"}), 400

    try:
        known = load_known_edges()
        hub_pairs = find_partial_hubs(origin, destination, known)

        print(f"🔎 Known route segments loaded: {len(known)}")
        print(f"🔍 Hub candidates for {origin} → {destination}:")
        for a, b in hub_pairs:
            print(f"  {a['from']} → {a['to']} + {b['from']} → {b['to']}")

        with open("ai/prompts/route_planner.txt", "r", encoding="utf-8") as f:
            prompt = f.read()

        input_data = {
            "origin": origin,
            "destination": destination,
            "known_hubs": [{"via": a["to"], "legs": [a, b]} for a, b in hub_pairs]
        }

        messages = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": f"Suggest a route from {origin} to {destination}. Known connections: {json.dumps(input_data)}"}
        ]

        try:
            result = ask_openai(messages)
            print("🧠 Raw AI response:\n", result)
        except Exception as e:
            return jsonify({"error": f"OpenAI API failed: {str(e)}"}), 500

        # Extract clean JSON from response
        json_start = result.find("[")
        parsed = json.loads(result[json_start:]) if json_start != -1 else []

        for leg in parsed:
            # 🧠 Step 1: Enrich missing info_links based on mode + country or region
            if not leg.get("info_links"):
                mode = leg.get("mode", "").lower()
                country_from = get_country_from_city(leg["from"])
                country_to = get_country_from_city(leg["to"])
                region = infer_region(country_from, country_to)

                links = lookup_booking_links(mode, country_from, country_to, region)
                if links:
                    leg["info_links"] = links

            # 🧼 Step 2: Fallback to legacy `info_link` → info_links
            if not leg.get("info_links") and leg.get("info_link"):
                leg["info_links"] = [{
                    "url": leg["info_link"],
                    "label": leg.get("mode", "Visit site").capitalize()
                }]

            # 🗃️ Step 3: Append booking sites to DB if new
            for link in leg.get("info_links", []):
                try:
                    base_url = link["url"].split("//")[-1].split("/")[0].replace("www.", "")
                    append_booking_site(base_url, link["label"])
                except Exception as e:
                    print(f"⚠️ Could not extract domain from {link['url']}: {e}")

        if isinstance(parsed, list) and all("from" in leg and "to" in leg for leg in parsed):
            append_ai_suggestions(parsed)

        return jsonify(parsed)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/booking-sites")
def get_booking_sites():
    print(f"📂 DB path in use: {DB_PATH}")

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT agency, primary_link, alt_links FROM booking_sites")

        rows = cursor.fetchall()
        print(f"📦 Retrieved {len(rows)} rows from DB")
        data = {
            row[0].lower(): {
                "primary": row[1],
                "alternatives": [x.strip() for x in (row[2] or "").split(",") if x.strip()]
            }
            for row in rows
        }
        conn.close()
        return jsonify(data)
    except Exception as e:
        print("❌ Error in /api/booking-sites:")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500








@app.route("/api/refresh-bookings")
def refresh_booking_data():
    try:
        all_sites = load_booking_sites()
        return jsonify({
            "count": len(all_sites),
            "unverified": {k: v for k, v in all_sites.items() if not v["verified"]},
            "all": all_sites
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

from admin_routes import admin
app.register_blueprint(admin)

def lookup_booking_links(mode, country_from, country_to, region):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT agency, primary_link, alt_links
        FROM booking_sites
        WHERE active = 'yes' AND modes LIKE ?
        AND (
            country = ? OR country = ? OR region = ?
        )
    """, (f"%{mode}%", country_from, country_to, region))

    results = []
    for agency, primary, alt in cursor.fetchall():
        if primary:
            results.append({"url": primary, "label": agency})
        for link in (alt or "").split(","):
            if link.strip():
                results.append({"url": link.strip(), "label": agency})
    return results

@app.route("/api/flag-leg", methods=["POST"])
def flag_leg():
    data = request.json
    from_city = data.get("from")
    to_city = data.get("to")
    index = data.get("index")

    path = Path("data/suggested_routes.json")
    if not path.exists():
        return jsonify({"error": "Routes file missing"}), 404

    with open(path, "r", encoding="utf-8") as f:
        routes = json.load(f)

    key = f"{from_city}-{to_city}"
    if key not in routes:
        return jsonify({"error": "Route not found"}), 404

    reported = routes[key].setdefault("reported_legs", [])
    if index not in reported:
        reported.append(index)

    with open(path, "w", encoding="utf-8") as f:
        json.dump(routes, f, indent=2)

    return jsonify({"status": "ok"})


city_country_map = {
    "Tehran": "Iran", "Istanbul": "Turkey", "Bari": "Italy", "Delhi": "India"
    # Extend this from your DB or JSON file
}

country_region_map = {
    "Iran": "Middle East",
    "Turkey": "Middle East",
    "Italy": "Europe",
    "India": "South Asia"
}

def get_country_from_city(city):
    return city_country_map.get(city, "Unknown")

def infer_region(country1, country2):
    return country_region_map.get(country1) or country_region_map.get(country2) or "Global"




if __name__ == "__main__":
    app.run(host="localhost", port=5001, debug=True)

