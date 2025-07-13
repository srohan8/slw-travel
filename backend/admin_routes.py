from flask import Blueprint, request, render_template, redirect, url_for, send_file
import sqlite3
import csv
import io
from pathlib import Path

admin = Blueprint("admin", __name__)
DB_PATH = Path(__file__).resolve().parent / "travel_data.db"

@admin.route("/admin/bookings")
def view_bookings():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
    SELECT id, agency, primary_link, search_url, alt_links, active, search_url_verified, modes
    FROM booking_sites
""")
    rows = cursor.fetchall()
    conn.close()
    return render_template("admin_bookings.html", rows=rows)

@admin.route("/admin/update", methods=["POST"])
def update_booking():
    data = request.form
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE booking_sites
        SET agency = ?, primary_link = ?, search_url = ?, alt_links = ?, 
            active = ?, search_url_verified = ?, modes = ?
        WHERE id = ?
    """, (
        data.get("agency"), data.get("primary_link"), data.get("search_url"), data.get("alt_links"),
        data.get("active", "no"), data.get("search_url_verified", "no"), data.get("modes", ""), data.get("id")
    ))
    conn.commit()
    conn.close()
    return redirect(url_for("admin.view_bookings"))

@admin.route("/admin/export")
def export_csv():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT agency, mode, country, continent, primary_link, alt_links, search_url, active, search_url_verified, last_seen FROM booking_sites")
    rows = cursor.fetchall()
    headers = [d[0] for d in cursor.description]

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    writer.writerows(rows)
    output.seek(0)

    return send_file(
        io.BytesIO(output.read().encode("utf-8")),
        mimetype="text/csv",
        as_attachment=True,
        download_name="booking_sites_export.csv"
    )

@admin.route("/admin/import", methods=["POST"])
def import_csv():
    file = request.files["csv"]
    stream = io.StringIO(file.stream.read().decode("utf-8"))
    reader = csv.DictReader(stream)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    for row in reader:
        cursor.execute("""
            INSERT OR REPLACE INTO booking_sites
            (agency, mode, country, continent, primary_link, alt_links, search_url, active, search_url_verified, last_seen)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            row.get("agency"), row.get("mode"), row.get("country"), row.get("continent"),
            row.get("primary_link"), row.get("alt_links"), row.get("search_url"),
            row.get("active", "yes"), row.get("search_url_verified", "no"), row.get("last_seen")
        ))

    conn.commit()
    conn.close()
    return redirect(url_for("admin.view_bookings"))
