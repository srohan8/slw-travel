# migrate_booking_csv.py
import sqlite3
import csv
from pathlib import Path



DB_PATH = Path(__file__).resolve().parent.parent / "backend" / "travel_data.db"
CSV_PATH = Path(__file__).resolve().parent.parent / "data" / "booking.csv"


def create_tables(conn):
    conn.execute("""
        CREATE TABLE IF NOT EXISTS booking_sites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agency TEXT UNIQUE,
            mode TEXT,
            country TEXT,
            continent TEXT,
            primary_link TEXT,
            alt_links TEXT,
            search_url TEXT,
            search_url_verified TEXT DEFAULT 'no',
            last_seen TEXT
        )
    """)

def migrate_csv_to_db():
    if not CSV_PATH.exists():
        print("❌ booking.csv not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    create_tables(conn)

    with open(CSV_PATH, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            conn.execute("""
                INSERT OR REPLACE INTO booking_sites 
                (agency, mode, country, continent, primary_link, alt_links, search_url, verified, last_seen)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                row["agency"], row.get("mode"), row.get("country"), row.get("continent"),
                row.get("primary_link"), row.get("alt_links"), row.get("search_url"),
                row.get("verified", "no"), row.get("last_seen")
            ))
    conn.commit()
    conn.close()
    print("✅ Migration complete!")

if __name__ == "__main__":
    migrate_csv_to_db()
