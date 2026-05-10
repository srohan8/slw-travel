---
title: "Importing a trip from a spreadsheet — CSV format guide"
date: 2026-05-10
layout: post
description: "By Sloth accepts CSV files from Google Sheets, Excel, or any app that exports plain text. Here's the column format and a template to get started."
---

*By the By Sloth team*

---

If you've been planning your overland trip in a spreadsheet, you can import it directly into By Sloth without re-entering everything by hand. By Sloth accepts `.csv` files — the plain-text format exported by Google Sheets, Excel, Numbers, LibreOffice Calc, and most other spreadsheet apps.

Once imported, you can use **AI Refine** to fill in missing details — booking platforms, km estimates, journey times, and confidence ratings.

---

## How to import

1. Open the **Trip planner** tab (the record icon in the navigation)
2. Click **Import CSV** in the toolbar above the route
3. Select your `.csv` file — By Sloth reads it and creates a trip plan from your stops
4. Click **AI Refine** to let the AI fill in booking sites, distances, and confidence ratings
5. Edit anything that needs adjusting, then save

---

## Column format

Each row in your CSV is one stop. The leg *leaving* that stop (the transport to the next city) is defined on the same row.

| Column | Accepted names | Required? | Example |
|--------|---------------|-----------|---------|
| Stop name | `stop`, `name`, `city`, `destination` | ✅ Yes | `Bangkok, Thailand` |
| Days at stop | `days`, `nights` | No | `3` |
| Transport mode | `mode`, `transport` | No | `train` |
| Distance (km) | `km`, `distance` | No | `650` |
| Cost | `cost`, `price` | No | `28` |
| Journey time (hours) | `hours`, `duration` | No | `9` |
| Notes | `notes`, `note`, `tip` | No | `Book 2 weeks ahead` |

**Column names are case-insensitive and can be in any order.** By Sloth detects them automatically.

If your file has no header row, By Sloth falls back to positional order: column 1 = stop name, column 2 = days, column 3 = mode, column 4 = km, column 5 = cost.

---

## Supported transport modes

| Value | Meaning |
|-------|---------|
| `bus` | Coach or local bus |
| `train` | Rail (any class) |
| `ferry` | Boat, ship, or water crossing |
| `shared-taxi` | Shared taxi or minibus (marshrutka, colectivo, etc.) |
| `car` | Own vehicle or rental |
| `cycle` | Bicycle leg |
| `walk` | On foot |
| `motorbike` | Motorcycle |
| `hitchhike` | Hitchhiking |
| `flight` | *(not recommended — By Sloth is overland-first, but it won't break anything)* |

---

## Template

Copy this into a `.csv` file or paste it into a new Google Sheet:

```
stop,days,mode,km,cost,notes
Lisbon,3,bus,600,15,Overnight bus from Sete Rios
Madrid,2,train,500,35,AVE high-speed; book 2 weeks ahead
Barcelona,4,ferry,,,
Marseille,2,train,300,25,
Lyon,1,train,150,20,
Paris,5,,,, 
```

**Tips:**
- The last stop has no transport row (there's no leg leaving it) — leave the transport columns blank on the last row
- You don't need to fill in `km`, `cost`, or `hours` — AI Refine will estimate them
- Quoted fields with commas work fine: `"Bangkok, Thailand"` parses correctly
- The file can have extra columns — By Sloth ignores any it doesn't recognise

---

## After import

Once your stops are loaded:

- **AI Refine** — fills in booking platforms, km, hours, costs, and confidence ratings for each leg. Only updates blank/zero fields — anything you've already filled in won't be overwritten.
- **Add bike info** — if you're doing a mixed cycling/transit trip, each train and bus leg has a "Bike accepted" field. Set it per leg.
- **Journal entries** — each stop has a text field for trip notes. Use it for planning notes before you leave, then update it as you travel.
- **Export GPX** — once your trip is saved, you can download a GPX file with all your stops as waypoints, compatible with Gaia, OsmAnd, Garmin, and any GPS app.

---

## GPX import

SLW also accepts `.gpx` files from Komoot, Gaia GPS, OsmAnd, Garmin, Google Maps, and other mapping apps. Click **Import GPX** next to the CSV button. Named waypoints become stops; distances are calculated from the coordinates.

---

<a href="/app.html#record" onclick="if(window.posthog)posthog.capture('blog_cta_click',{post:'csv_import_format',utm_campaign:'csv_import'})">Import your spreadsheet →</a>

---

*Questions about the import format? The column detection is flexible — if your spreadsheet has different column names, SLW will usually pick them up. If it doesn't, rename the stop column to `name` or `city` and try again.*
