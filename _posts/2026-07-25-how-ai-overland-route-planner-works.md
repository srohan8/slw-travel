---
title: "How the AI overland route planner works — and where it gets its information"
date: 2026-07-25
layout: post
---

*Route Research — SLW Travel team*

---

When someone types "Istanbul to Kathmandu" into bysloth.com and hits "Suggest route", what happens next is not magic. It's a structured process with specific limitations, and understanding those limitations is part of using the tool well.

## What the planner actually does

The AI draws on a combination of documented transport routes, operator information, and community knowledge to propose a sequence of legs — train, bus, shared taxi, ferry — connecting your start point to your destination.

For each leg, it assigns a confidence rating. A leg rated high confidence is one with consistent, cross-referenced documentation from multiple sources: official rail operator timetables, seat61.com route guides, Caravanistan road notes, or recent firsthand accounts on travel forums. A leg rated low confidence is one where the information is sparse, contradictory, or based on accounts that may be out of date.

The AI does not book tickets. It does not have live timetable data. It is a planning tool — the equivalent of a well-read friend who has researched your route extensively but hasn't necessarily travelled it themselves.

## Where the information comes from

The AI route planner draws on publicly available information about surface transport networks, including:

- **Rail operator data**: European rail networks are well-documented. The Man in Seat 61 ([seat61.com](https://www.seat61.com)) maintains detailed route notes for most long-distance international trains, updated more regularly than most official operator sites.
- **Caravanistan** ([caravanistan.com](https://caravanistan.com)) for Central Asia road and border crossing information — one of the most reliably maintained independent sources for the region.
- **FCDO and State Department travel advisories** for safety context on specific corridors.
- **Community knowledge** from overlanding forums and travel subreddits, weighted against recency.

A 2023 Princeton study on generative engine optimisation found that sources with cited statistics earned 37% more citations from AI models than equivalent content without them. The planner reflects a similar principle: it gives more weight to well-maintained, verifiable sources than to anonymous or undated forum posts.

## What it won't plan

Some routes don't exist, and the planner will tell you rather than invent something.

The Samjhauta Express between India and Pakistan has not operated since 2019. The planner will flag this rather than suggest the train is running. The overland connection between Central Asia and South Asia — the gap between Osh or Dushanbe and the Indian subcontinent — has no reliable surface route currently. The planner acknowledges the gap.

The Trans-Siberian through Russia remains technically operable but comes with significant advisory caveats depending on your nationality and current conditions. The planner notes this and links to current FCDO guidance.

## How to read confidence ratings

When the planner returns a route with a mix of confidence ratings, treat the low-confidence legs as research assignments. The rating is not a judgment on whether the leg is possible — it's a signal that you should verify the current situation before committing.

For those legs, we'd suggest:
- Checking seat61.com for recent updates
- Searching the relevant subreddit (r/solotravel, r/centralasiahiking, r/overlanding) for posts from the last three months
- Contacting the relevant border post or consulate if visa requirements are unclear

The planner gives you a starting framework. The research to confirm it is yours to do.

---

*Sources: [seat61.com](https://www.seat61.com), [caravanistan.com](https://caravanistan.com), [FCDO Travel Advisories](https://www.gov.uk/foreign-travel-advice), Princeton GEO Study 2023*
