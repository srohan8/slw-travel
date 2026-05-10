---
title: "Why Rome2rio gets overland routes wrong — and what to use instead"
date: 2026-05-10
layout: post
description: "Rome2rio shows routes that don't exist, buses that stopped running, and trains with no tickets available. Here's why it fails overland travellers and what the alternative looks like."
---

*By the By Sloth team*

---

There's a specific kind of frustration that comes from trusting a tool that sounds confident. You check Rome2rio before a journey, you see a route, you budget your time accordingly, you arrive at a bus station in the cold — and then you wait.

This is not a hypothetical. It's one of the most common complaints about route-planning tools from people who travel seriously overland.

> "We waited for over an hour in the cold but the bus never arrived." — PissedConsumer review

> "All cheap routes suggested like buses are totally non-existent, and many expensive trains suggested do not exist as well." — PissedConsumer

> "RometoRio is the LEAST accurate travel app/site I have ever dealt with." — PissedConsumer

> "Information regarding travel in Turkey is way out of date." — Trustpilot

The problem isn't malice. It's a structural one: Rome2rio aggregates data from operators and public feeds, but it has no reliable mechanism to know when a route has been discontinued, when a seasonal service ended two years ago, or when a local bus company stopped operating. It *can't* tell you that — not because no one tried, but because that information isn't systematically available anywhere.

---

## Why the inaccuracy is structural, not incidental

General travel aggregators face an impossible data-freshness problem. There are thousands of bus operators globally — most of them small, many of them in regions with poor digital infrastructure, running services on schedules that change with the season, the politics, or just because the owner retired. No central database tracks all of this. No algorithm can crawl it reliably.

Rome2rio is most accurate where data is most structured: Western European rail, major long-haul routes, well-documented intercity services. It becomes increasingly unreliable as you move into:

- Central America, where local buses are often informal and schedule-free
- Central Asia, where shared taxis and minibuses are the norm and no operator publishes a timetable
- South and Southeast Asia for border crossings and rural connections
- Anywhere with recent political disruption (new borders, suspended services, road closures)
- Regional services operated by small local companies with no web presence

> "Whilst travelling in Central America I have found many routes to be inaccurate." — PissedConsumer

> "It isn't always complete or accurate — told me there were only two buses, but when I checked directly I found an 11:45 that Rome2Rio hadn't listed." — Camino de Santiago forum

The second quote is actually the optimistic version of the problem: sometimes the information is wrong in a way that undercounts options. More dangerous is when it overcounts — when it shows you a route that doesn't exist.

---

## The confidence problem

Every route-planning tool faces the same underlying challenge: the difference between "this route exists in our database" and "this route will work when you turn up to take it."

Most tools collapse this distinction. They show you the route and leave you to assume it's current.

By Sloth is built around making that distinction explicit. Every leg in a SLW route plan carries one of four confidence ratings:

**Safe route** — Well-established, frequently-operated connection. AI is confident this runs reliably; no verification needed before booking.

**Traveller confirmed** — A community member has recently done this leg and confirmed it works. This is the highest signal: not just database-present, but real-world verified in the last few months.

**Check locally** — The route exists but conditions may have changed. Seasonal closures, border status, service frequency — verify before committing.

**Unverified** — Limited data. We found something, but we don't know if it's current. Research carefully before relying on this.

The difference between "safe route" and "traveller confirmed" matters: a well-known train between two major European cities is obviously safe without anyone needing to confirm it. But a border crossing in Central Asia, or a weekly ferry to an island, or a bus route through a country that's had recent political disruption — that needs a real person who was there recently.

This is the information that doesn't exist in any database. It exists in people's heads, in trip reports, in the community of people who've done these routes. By Sloth is building the infrastructure to surface it.

---

## What the alternative actually looks like

Most serious overland travellers today cobble together their own version of route intelligence: Rome2rio as a starting point, then five browser tabs of blog posts, then a Reddit question they have to wait three days for someone to answer, then a Booking.com spreadsheet they lose track of halfway through. 

> "Never FULLY trust Google Maps. They rarely update their schedules for delays or possible route changes." — r/backpacking

The real competition isn't a better version of Rome2rio. It's that whole chaotic research process — and building something that actually replaces it.

---

## If you're planning an overland route

By Sloth generates realistic multi-leg surface routes with confidence ratings per leg, booking links relevant to that mode and region, and live advisory data on border crossings and conflict zones.

It's free to try. It's built by people who've done these trips.

<a href="/app.html#plan" onclick="if(window.posthog)posthog.capture('blog_cta_click',{post:'rome2rio',utm_campaign:'rome2rio_alt'})">Plan your route →</a>

---

*By Sloth is in private beta. Routes are generated by AI with community verification — we flag what we don't know rather than pretending we know everything.*
