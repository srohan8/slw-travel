---
title: "Polarsteps vs planning your trip: the gap nobody has filled yet"
date: 2026-05-10
layout: post
description: "Polarsteps is good for recording where you've been. It's not a trip planner. Here's what people who've tried to use it for planning actually found — and what a real plan-to-record tool would look like."
---

*By the By Sloth team*

---

There's a moment that a lot of overland travellers will recognise.

You've decided to do a big trip. You want to track it somewhere — document it, share it with people back home, have something to look back on. You hear about Polarsteps. You download it. You try to plan your upcoming route in it. And then you hit the wall: there's no way to plan a future trip. No way to add stops you haven't been to yet. No way to map out the route before you leave.

> "I'm looking to switch from other apps like Wanderlog to Polarsteps but I can't find a way to plan my next trip and add different locations." — r/Polarsteps

> "Trip planning features are very basic." — FlightDeck review

This isn't a hidden limitation — Polarsteps is explicitly a *recording* tool, not a planning one. It tracks where you are. It draws a line on a map. It looks great after the fact. But it was never designed to help you figure out how to get somewhere you haven't been yet.

The result is a gap. People use one tool to plan (Rome2rio, a spreadsheet, a Notion doc, a combination of all three) and a different tool to record (Polarsteps, a physical journal, Instagram Stories). The two never talk to each other. The plan you made months ago has nothing to do with the account of the trip you actually took.

---

## What people actually do

The current workflow for a serious overland trip looks something like this:

1. Research routes across 10+ sources — blogs, Rome2rio, Reddit threads, Facebook groups
2. Build a rough itinerary in a spreadsheet or Notion
3. Book things ad hoc as the trip progresses, lose track of what's confirmed and what's speculative
4. Travel, deviating from the plan constantly (which is fine, that's how it works)
5. Post on Instagram or Polarsteps as you go — but these are disconnected from the plan
6. Come home with a trip that happened but isn't documented anywhere except in fragments

The planning layer and the recording layer are completely separate. Nothing ties them together. The plan you made is orphaned the moment you leave. The record you kept has no context — why you went this way, what the alternatives were, what the crossing was actually like.

---

## What a plan-to-record tool would look like

The roadmap vision for By Sloth is to close this gap: plan your route in the tool, then record the trip *in the same tool* as it happens.

Each stop in your plan gets a journal entry. Each leg carries the notes you wrote when you crossed it. The confidence rating on that border crossing gets a community note from you, because you just did it yesterday and you know what the current situation is.

This isn't just a nicer experience — it produces something genuinely useful. Your journey becomes a structured document: this is where I went, this is how I got there, this is what the crossing was like, this is what I'd tell someone planning the same route.

That document is valuable to future travellers. It's also a better version of your trip record than a straight line drawn on a map.

---

## What's live today

The journal feature is in progress. What's live now in By Sloth:

- **Journal entry per stop** — a text field on every stop in your plan. Write notes during the trip, not just before it.
- **Mark as visited** — tap "Mark as visited" on each stop as you pass through. Your trip view shows which stops are done, with the date.
- **Community notes on legs** — you can add a note to any leg you've done, including the current confidence of a border crossing or a transport connection. Your note gets flagged with the date, so future travellers know how fresh it is.

The full plan-to-record experience — where the route you planned and the journey you recorded are one continuous document — is what we're building toward.

---

## If you've been using a spreadsheet

You can import it. By Sloth accepts CSV files from Google Sheets, Excel, or any app that exports plain text. Drop in your stops, days, and any other columns you have — By Sloth reads them and turns them into a trip plan. From there, AI Refine can fill in booking sites, km estimates, and confidence ratings. Then you can use that plan as the skeleton for your journal.

[Plan your overland route →]

<a href="/app.html#plan" onclick="if(window.posthog)posthog.capture('blog_cta_click',{post:'polarsteps_gap',utm_campaign:'polarsteps_gap'})">Start planning →</a>

---

*By Sloth is in private beta. The journal and plan-to-record features are in active development.*
