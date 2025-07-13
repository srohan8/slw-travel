import sqlite3
import pycountry
from countryinfo import CountryInfo
from pathlib import Path

SOURCE = Path(__file__).resolve().parent.parent /"data"/ "geonames" /"cities500.txt"
DB_PATH = Path(__file__).resolve().parent.parent / "backend" / "travel_data.db"

def country_name(code):
    try:
        return pycountry.countries.get(alpha_2=code).name
    except:
        return code

def get_region(country):
    try:
        return CountryInfo(country).region()
    except:
        return "Unknown"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS cities (
            id INTEGER PRIMARY KEY,
            name TEXT,
            country TEXT,
            country_code TEXT,
            region TEXT,
            lat REAL,
            lon REAL,
            population INTEGER
        )
    """)
    conn.commit()
    return conn

def load_cities():
    conn = init_db()
    cursor = conn.cursor()
    seen = set()
    with open(SOURCE, encoding="utf-8") as f:
        for line in f:
            parts = line.strip().split("\t")
            if len(parts) < 19:
                continue
            name = parts[1]
            country_code = parts[8]
            try:
                lat = float(parts[4])
                lon = float(parts[5])
                pop = int(parts[14])
            except:
                continue
            if name in seen:
                continue
            seen.add(name)
            country = country_name(country_code)
            region = get_region(country)
            cursor.execute("""
                INSERT INTO cities (name, country, country_code, region, lat, lon, population)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (name, country, country_code, region, lat, lon, pop))
    conn.commit()
    conn.close()
    print("✅ cities table created with", len(seen), "unique cities")

if __name__ == "__main__":
    load_cities()
