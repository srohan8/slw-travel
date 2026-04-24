---
title: "What the AI gets wrong — and the routes we won't plan until we're sure"
date: 2026-04-24
layout: post
---

*By the SLW Travel team*

---

Every AI travel planner has a confidence problem. Not a lack of confidence — too much of it. Ask most AI tools to plan a route and they will give you one. Fluent, specific, structured. Train at 08:40, bus from the north terminal, ferry on Tuesdays and Fridays. It sounds right. Sometimes it is. Sometimes the train hasn't run in four years and the north terminal closed in 2022 and the ferry is freight-only.

SLW Travel is built on a different assumption: that being honest about what we don't know is more useful than sounding certain about everything.

This post is about where that honesty currently lives — the routes we flag, the legs we refuse to confirm, and a few corridors we won't plan at all yet because the gap between what the AI can say and what is actually true is too wide to bridge with a confidence badge.

---

## The Samjhauta Express

This is the one we mention most often, because it is the clearest example of the problem.

The Samjhauta Express was a train service running between Attari (India) and Lahore (Pakistan) — one of the only direct passenger rail links between the two countries. It was suspended in February 2019 following the Pulwama attack and the subsequent deterioration in India-Pakistan relations. As of this writing in April 2026, it has not resumed. The track exists. The stations exist. The service does not.

Ask a general-purpose AI to plan an overland route from Delhi to Lahore and there is a meaningful chance it will mention the Samjhauta Express. It is in the training data. It was a real service. The AI has no reliable mechanism for knowing it was suspended seven years ago and has not come back.

In the SLW Travel planner, any route leg involving India-Pakistan surface crossings is flagged **Uncertain** and accompanied by a note explaining the suspension. We do not suggest the Samjhauta Express as a plannable option. We are not going to pretend otherwise until there is a published timetable and tickets are actually on sale.

---

## The Trans-Asia Express and Lake Van ferry

The Trans-Asia Express was one of the more extraordinary train journeys in the world — Istanbul to Tehran, with a section where the train carriages were loaded onto a ferry to cross Lake Van in eastern Turkey, then reassembled on the other side. It ran, in various forms, until around 2015 when a combination of track damage and political pressure wound it down.

It is still romanticised in travel writing. It still appears in AI route suggestions. It does not run.

The Lake Van ferry itself continues to operate — used by locals and occasionally by travellers doing the eastern Turkey corridor. But the through-train to Tehran, the cross-border rail connection, the ability to book one ticket from Istanbul to Iran's capital by train — that is gone, at least for now.

We flag any AI suggestion of a direct Istanbul-Tehran train as **Uncertain** with a note about the service history. The overland route from Istanbul to Tehran does exist — it involves a bus from Dogubeyazit or the Van to Tabriz corridor — but it is not a train, and we will not call it one.

---

## Myanmar

Myanmar appears in a lot of overland route planning for Southeast Asia. Historically it was a bridge between Thailand and India — the missing land link that, if it ever fully opened to foreign travellers, would complete an overland route from Singapore to London without a single flight.

We do not plan routes through Myanmar. The country has been under military control since the 2021 coup, and the ongoing conflict affects large parts of the country seriously enough that FCDO, US State Department, and most other governments advise against all or most travel. Any overland corridor the AI might suggest — the Tamu crossing into India, the Kengtung routes toward China — passes through areas of active conflict or military restriction.

The app flags Myanmar at the highest level in our conflict zone database: **Do not travel**. We surface the FCDO and State Department guidance directly. We do not suggest workarounds. Some risks are not ours to minimise.

---

## The Wakhan Corridor

The Wakhan Corridor — the narrow strip of Afghanistan connecting Tajikistan to the Chinese border — is one of the most discussed overland routes in adventure travel circles. For a period in the 2010s it was genuinely accessible to experienced travellers with permits and a guide. It appears on lists of great overland journeys with some regularity.

Afghanistan is currently flagged in our conflict zone database at the **Do not travel** level. The Wakhan specifically has been discussed in travel forums as potentially safer than the rest of the country, but the border with China at the eastern end (the Wakhjir Pass) is closed to non-nationals, and the border with Tajikistan at the western end requires permissions that are not reliably available.

Any AI-generated route that includes the Wakhan Corridor as a plannable leg is wrong. We will not plan it.

---

## Sudan and the overland Africa route

The Cape to Cairo overland route — surface transport from South Africa to Egypt — is one of the oldest and most discussed long-distance journeys. It has always required improvisation on certain legs. The Sudan section has historically been the most difficult, alternating between manageable and impassable depending on the political situation.

Sudan is currently flagged at **Do not travel** in our conflict zone database. The conflict that began in 2023 has displaced millions of people and rendered most overland crossings unsafe. The ferry from Wadi Halfa (Sudan) to Aswan (Egypt) — one of the iconic legs of the Cape to Cairo route — operates intermittently if at all, and reaching Wadi Halfa involves crossing a country in active civil conflict.

We flag any Africa route passing through Sudan at the highest level. The app will tell you clearly, link to the current guidance, and leave the decision to you.

---

## Why we are telling you this

Most travel apps do not publish posts about what they cannot do. The incentive is to appear capable of everything and let the small print handle the liability.

We think this is the wrong approach, particularly for the travellers SLW Travel is built for. A digital nomad planning six months across Central Asia, a journalist trying to get from Nairobi to Cairo, a researcher crossing into a conflict-adjacent country — these are not people who benefit from an AI that sounds confident about everything. They need to know which parts of the plan are solid and which parts they need to verify themselves.

The confidence labels in the planner — **Verified**, **Verify before booking**, **Uncertain** — exist for exactly this reason. So does this post. The routes above are the ones where the gap between what AI training data contains and what is true on the ground is wide enough to cause real harm if someone trusted the wrong answer.

We would rather tell you we don't know than guess.

---

## What we are working on

Phase 2 of the SLW Travel route knowledge base involves curating a graph of verified connections — routes checked against live operator data, recent traveller reports, and official timetables. As that database builds, the number of **Verified** legs will grow and the **Uncertain** ones will shrink.

In the meantime, for any leg the AI flags as Uncertain, we recommend:
- [Seat61](https://www.seat61.com) — the most reliable single source for train routes worldwide
- [Caravanistan](https://caravanistan.com) — for Central Asia, Caucasus, and the Silk Road corridor
- [Rome2rio](https://www.rome2rio.com) — for a broad map of surface options (useful for checking what modes exist, less reliable on current schedules)
- The relevant FCDO and State Department pages — for anything passing through or near a conflict zone

If you have made a journey recently that the app is flagging incorrectly — a leg we've marked Uncertain that is actually running fine, or a route we've missed entirely — [tell us](mailto:hello@slwtravel.com). The knowledge base improves when people who have been there tell us what they found.

---

*All conflict zone data in the SLW Travel planner is maintained in a live database and refreshed regularly. Advisory levels are linked directly to FCDO and US State Department guidance. The app informs — it never blocks.*

*Try the [SLW Travel planner](https://slwtravel.com).*
