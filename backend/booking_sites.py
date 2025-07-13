import sqlite3
from urllib.parse import urlparse
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).resolve().parent.parent / "backend" / "travel_data.db"

def get_domain(url):
    try:
        return urlparse(url).netloc.lower().replace("www.", "")
    except:
        return ""

def load_booking_sites():
    sites = {}

    if not DB_PATH.exists():
        print(f"❌ DB file not found: {DB_PATH}")
        return sites

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT agency, primary_link, search_url, search_url_verified, active
            FROM booking_sites
            WHERE active = 'yes'
        """)
        rows = cursor.fetchall()

        for agency, primary_link, search_url, verified, active in rows:
            domain = get_domain(primary_link)
            if not domain:
                print(f"⚠️ Skipping invalid URL for agency {agency}: {primary_link}")
                continue

            sites[domain] = {
                "provider": agency,
                "search_url_template": search_url or "",
                "active": (active or "").lower() == "yes"
            }

    except Exception as e:
        print("❌ Error loading booking_sites from DB:", e)
    finally:
        conn.close()

    return sites

def append_booking_site(base_url, provider):
    if not DB_PATH.exists():
        print(f"❌ DB file not found: {DB_PATH}")
        return


    domain = get_domain(f"https://{base_url}")
    if not provider or provider.lower() in ["bus", "train", "ferry"]:
        provider = domain.split(".")[0].capitalize()

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT 1 FROM booking_sites WHERE agency = ? OR primary_link LIKE ?", (provider, f"%{domain}%"))
        if cursor.fetchone():
            print(f"ℹ️ Booking site already exists: {domain}")
            return

        cursor.execute("""
            INSERT INTO booking_sites 
            (agency, mode, country, continent, primary_link, alt_links, search_url, search_url_verified, last_seen)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            provider, "", "", "", f"https://{domain}", "", f"https://{domain}/search/A/B", "no", datetime.utcnow().isoformat()
        ))

        conn.commit()
        print(f"✅ Added new booking site: {provider} ({domain})")
    except Exception as e:
        print("❌ Error inserting booking site:", e)
    finally:
        conn.close()
