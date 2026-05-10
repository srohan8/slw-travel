---
title: "Why Rome2rio gets overland routes wrong — and what to use instead"
date: 2026-05-10
layout: post
---

*By the Sloth team*

---

If you've been burned by Rome2rio, you already know the shape of the problem. You checked the route, saw that a bus existed, planned your day around it, showed up at the stop — and nothing came. Or the bus existed in name only, on a route that had been abandoned long before you arrived.

This post is about why that happens. Not because Rome2rio is badly built — it isn't — but because it's answering a different question than the one you're actually asking.

---

## Two different questions

There is a meaningful difference between two things that look identical on a route planner:

1. *There is a bus route between these cities.*
2. *There is a bus leaving tomorrow at 09:00 that you can buy a ticket for.*

Rome2rio is predominantly answering the first question. Its strength is aggregating routing data — the existence of transport links between places. Does a connection exist in principle? Rome2rio is often useful for that. Is the connection operating right now, this week, with a timetable you can rely on? That's operational data, and it's a fundamentally different thing to collect and maintain.

This isn't a quality problem. It's a data-model problem. Rome2rio's architecture is built around mapping route possibilities. The gap opens when travellers read those possibilities as current, bookable, confirmed services — which is an entirely natural thing to do, and which Rome2rio's interface does not do enough to discourage.

The result is captured neatly by the people who've been on the receiving end of it. "RometoRio is the LEAST accurate travel app/site I have ever dealt with," wrote one traveller via Trustpilot. Another: "All cheap routes suggested like buses are totally non-existent, and many expensive trains suggested do not exist as well" (via PissedConsumer). These aren't isolated gripes. They describe a systematic pattern: the low-cost, locally-operated options — the ones that matter most to overland travellers — are precisely where the gap between routing data and operational reality is widest.

---

## Where the gap is worst

The problem isn't uniformly distributed. Rome2rio is reasonably reliable for major European rail routes, where the underlying operator data is structured, machine-readable, and kept current. For flights it's a genuinely useful comparison tool.

The gap opens — sometimes to an impassable chasm — in the regions where overland travel is most interesting and most complex:

**Central America.** Local buses, chicken buses, shared shuttles operated by small companies with no web presence and no API feed. Rome2rio may know a route exists; it almost certainly doesn't know the current schedule. "Whilst travelling in Central America I have found many routes to be inaccurate," one traveller noted via PissedConsumer. This is structural, not incidental.

**Southeast Asia.** The same problem: a patchwork of local operators, informal crossings, services that run seasonally or that depend on border conditions that change without notice.

**Turkey and the surrounding region.** "Information regarding travel in Turkey is way out of date," wrote one traveller via Trustpilot. The Turkish long-distance bus network has changed substantially in recent years, and the frequency and routing of services between cities doesn't map neatly to anything Rome2rio can reliably aggregate.

**Overland Africa.** Any route through Central or East Africa involves a mix of local minibuses, shared taxis, ferries, and occasional rail that operates on its own schedule. Routing data exists. Operational data is thin.

In all of these places, the traveller experience described on review sites clusters around the same moment: "We waited for over an hour in the cold but the bus never arrived" (via Trustpilot). That's not a bad interface. That's someone who planned a day, maybe a connection, maybe an entire itinerary, around data that was never reliable enough to plan from.

---

## What Rome2rio is actually good for

We'd rather be honest about this than score a cheap point. Rome2rio is useful for:

- Getting a quick read on what *modes* exist between two cities — is there rail? Is there a ferry option? Are people taking buses or flying?
- Flight comparison, where the underlying data is live and structured
- Well-serviced European corridors where rail data is solid
- The early stages of planning, when you're sketching possibilities rather than booking them

Where it's not reliable is when you move from "what might exist" to "what I should actually do tomorrow." And that is exactly the moment when most overland travellers are consulting it.

---

## What we do differently

By Sloth approaches this from a different direction. Instead of trying to aggregate every possible route and presenting them all as equally real, we build in uncertainty explicitly.

Every route leg in the planner carries a confidence rating:

- **Safe route** — we have enough current information to be confident this connection is operating
- **Check locally** — the route likely exists but verify the timetable and operator before you rely on it
- **Unverified** — we know a connection has existed here; we do not have current data and you should not plan a hard connection from this leg alone

This matters because it changes what you do with the information. A "Check locally" rating is not the same as a failure — it's a signal to check Seat61, look for the local operator's Facebook page, ask at your hostel, confirm at the station the day before. That's useful travel intelligence. What isn't useful is a confidently-presented route that doesn't exist.

We also surface community notes from people who've done specific legs recently — the kind of ground-truth information that no aggregator can reliably capture because it's not in any database. And for routes passing through or near unstable regions, we surface live conflict and advisory data at the leg level, so you're not toggling between a route planner and a government advisory page trying to cross-reference them manually.

We're not going to claim our coverage is complete. It isn't. We are building the route knowledge base incrementally, and there are corridors where our confidence ratings will say "Unverified" not because the route doesn't exist but because we don't have recent enough data to say more. That's the honest position, and we'd rather hold it than present something we can't stand behind.

---

## A practical approach

If you're planning an overland route that involves any of the regions above, we'd suggest treating any source — Rome2rio, us, or anyone else — as a starting point rather than a confirmation. The travellers who navigate these routes well tend to layer their information: use a planner to sketch the shape of the journey, then verify the legs that matter most through sources with more recent operational knowledge.

For specific corridors, [Seat61](https://www.seat61.com) remains the most careful source for rail routes worldwide. [Caravanistan](https://caravanistan.com) is invaluable for Central Asia and the Silk Road corridor. And for anything touching a politically unstable region, the FCDO and State Department advisory pages are not optional reading.

By Sloth is designed to sit alongside these sources, not replace them — and to be explicit about what it knows, what it's uncertain about, and where you need to verify before you commit.

---

If you're planning an overland route and want to see where our confidence ratings land on your specific legs, the planner is at [/app.html](/app.html). If you've done a leg recently that we've got wrong — flagged as Unverified when it's running fine, or missed entirely — tell us. The knowledge base improves one leg at a time.
