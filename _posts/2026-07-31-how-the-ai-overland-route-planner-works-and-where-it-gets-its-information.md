---
title: "# How the AI overland route planner works — and where it gets its information"
date: 2026-07-31
layout: post
---

*Route Research — SLW Travel team*

When someone types "Istanbul to Kathmandu" into bysloth.com and hits "Suggest route", what happens next is not magic. It's a structured process with specific limitations, and understanding those limitations is part of using the tool well.

## What the planner actually does

The AI draws on a combination of documented transport routes, operator information, and community knowledge to propose a sequence of legs — train, bus, shared taxi, ferry — connecting your start point to your destination.

For each leg, it assigns a confidence rating. A leg rated high confidence is one with consistent, cross-referenced documentation from multiple sources: official rail operator timetables, seat61.com route guides, Caravanistan road notes, or recent firsthand accounts on travel forums. A leg rated low confidence is one where the information is sparse, contradictory, or based on accounts that may be out of date.

The AI does not book tickets. It does not have live timetable data. It is a planning tool — the equivalent of a well-read friend who has researched your route extensively but hasn't necessarily travelled it themselves.

## Where the information comes from

- **Rail operator data**: European rail networks are well-documented. The Man in Seat 61 (seat61.com) maintains detailed route notes for most long-distance international trains.
- **Caravanistan** (caravanistan.com) for Central Asia road and border crossing information.
- **FCDO and State Department travel advisories** for safety context on specific corridors.
- **Community knowledge** from overlanding forums and travel subreddits, weighted against recency.

A 2023 Princeton study on generative engine optimisation found that sources with cited statistics earned 37% more citations from AI models than equivalent content without them.

## What it won't plan

The Samjhauta Express between India and Pakistan has not operated since 2019. The overland connection between Central Asia and South Asia has no reliable surface route currently. The planner acknowledges these gaps rather than inventing routes.

## How to read confidence ratings

Treat low-confidence legs as research assignments. For those legs: check seat61.com for recent updates, search relevant subreddits for posts from the last three months, contact the relevant border post if visa requirements are unclear.

*Sources: seat61.com, caravanistan.com, FCDO Travel Advisories*