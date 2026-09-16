# PropScout

An offline companion for property visits. Built for a Jaipur 3 BHK hunt: eight
researched projects, a negotiation estimator, a Jaipur-specific due-diligence
checklist, and somewhere to put every photo, video and voice note so you can
actually review it all when you get home.

**No account. No login. Nothing leaves your phone.** Everything — including
every photo — is stored in your browser's own storage on the device. There is no
server and no network call.

---

## Put it on your phone

Open the app URL in your phone's browser, then add it to your home screen. After
that it opens full screen and works with no signal at all.

**iPhone (Safari)** — tap the Share button, scroll down, tap **Add to Home
Screen**, then **Add**.
*It must be Safari. Chrome on iOS cannot install web apps.*

**Android (Chrome)** — tap the **⋮** menu, then **Install app** (or **Add to
Home screen**). You may also get an install banner at the bottom.

Installing matters for more than convenience: browsers are far less likely to
clear the stored data of an installed app, and your photos live in that storage.

---

## Back up every evening

This is the one thing to remember. All your data is on the phone only, so:

**Settings → Full backup (with photos)** at the end of each day of visits, then
email the `.zip` to yourself.

The zip contains a restorable `data.json`, every photo/video/voice note foldered
by property, and a plain-text `summary.md` you can read without the app.
Restore from **Settings → Restore**.

---

## What's in it

| Screen | What it's for |
| --- | --- |
| **Places** | Every property as a card: price, rate per sqft, how it compares to the locality rate, your score, problems found. Search, filter and sort. |
| **Plan** | Your trip laid out day by day and time by time, with a one-tap Google Maps route for the whole day and directions from each stop to the next. |
| **Compare** | All eight side by side across 19 rows. The best value in each row is highlighted green. Compare on **carpet rate** and **all-in cost**, not headline price. |
| **Guide** | The market frame, locality rates and trends, the negotiation playbook, walk-away red flags, and a plain-English glossary of the jargon. |
| **Settings** | Backup and restore, text size, dark mode, stamp-duty and loan assumptions, storage usage. |

Inside each property:

- **Briefing** — the pre-visit research: what to verify *here*, when to walk
  away, lines to use, what's winnable, what's unverified, developer credibility.
- **Price** — asking price and rate per sqft against the locality rate, an
  estimated negotiation range with an open / aim / never-above ladder, a
  leverage checklist that moves the estimate, the full all-in cost breakdown
  (stamp duty, cess, registration, GST, brokerage, deposits, interiors) and EMI.
- **Checklist** — 100+ checks tuned to Jaipur: patta and who issued it, 90A/90B
  conversion, JDA layout, OC/CC, seepage, water source and summer supply, hard
  water, DG backup scope, loading factor, waterlogging, west-sun rooms. Each has
  a plain explanation of *why it matters* and *how to check it on site*.
- **Questions** — 60 questions grouped by who to ask, with the handful that
  reveal the most marked **Key**, and space to record the answers.
- **Photos** — camera, video and voice notes. Photos are downscaled on the
  device before saving so you don't run out of space mid-trip. Tag once and the
  tag sticks for a run of shots.
- **Verdict** — rate 11 weighted categories, list what you liked and what
  worried you, tick the amenities it really has, and set the decision.

**Visit mode** (the ▶ button) is the one to use while standing there: a guided
step-by-step flow with big buttons, a camera button always on screen, and a
rate-it-now step before you leave the gate.

---

## Adding and changing properties

Edit [`src/data/seed.ts`](src/data/seed.ts). Only `name` is required, and money
accepts whatever you'd naturally type.

```ts
{
  name: 'Some Project',
  type: 'flat',              // flat | villa | plot | commercial
  builder: 'Some Builder',
  locality: 'Jagatpura',
  maps: 'Some Project, Jagatpura, Jaipur',   // or a Maps link, or "26.91,75.78"
  config: '3 BHK',
  sqft: 1800,                // super built-up
  carpet: 1250,
  price: '95 L',             // "1.35 cr" | "85 lakh" | 9500000 all work
  marketRate: 4865,          // going rate per sqft in that locality
  gstPct: 0,                 // 0 ready-to-move, 5 under-construction
  day: 1, time: '09:30',     // drops it into the trip plan
  amenities: ['am_lift', 'Covered parking'],  // ids or plain labels
  pros: ['Big rooms'],
  cons: ['Water is tankered'],
  notes: 'Anything you want to see on the briefing tab.',
}
```

Then in the app: **Settings → Reload the built-in property list**.

This is safe to press at any point during the trip. Properties are matched by
name, and the reload only fills in fields that are still blank plus refreshes
the research briefing. **Your photos, checklist answers, ratings, notes and
prices are never overwritten.**

You can also add a property by hand in the app (**+**) — useful when a broker
shows you something unplanned.

The optional `brief` field carries pre-visit research (rank, verdict,
watchouts, walk-away triggers, scripts, price ranges, developer notes). See any
of the eight existing entries for the shape.

---

## The eight properties

Seeded from a knowledge base compiled 16 September 2026, and ordered into a
two-day route: the ready-to-move flats first, because a completed building has
to be physically inspected.

**Day 1** — Trimurty Ariana (Jagatpura, rank 1) · JVJ Silicon Valley
(Jagatpura) · Ashiana Amantran (Vaishali Nagar Ext, rank 2)

**Day 2** — Shubhashish Geeta · Ashiana Ekansh · Shubhashish Prakash ·
Ashiana Nitara · Dukia Aerovista *(all in the Mansarovar Ext / Ajmer Road belt)*

> Every price, rate and RERA number in the app is **desk research that lags the
> market by 1–3 months**, and the sources frequently conflict — the app flags
> the conflicts rather than hiding them. Re-confirm on
> [rera.rajasthan.gov.in](https://rera.rajasthan.gov.in) and with two local
> brokers before you transact. Nothing in the app is legal or financial advice.

---

## Running it locally

```bash
npm install
npm run dev
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the built app |
| `npm test` | Unit tests for the money, negotiation and scoring maths |
| `npm run typecheck` | TypeScript, strict |

Pushing to `main` builds and deploys to GitHub Pages automatically
(`.github/workflows/deploy.yml`), which runs typecheck and tests first.

## How it's built

Vite · React · TypeScript (strict) · IndexedDB via `idb` · `fflate` for the
backup zip · `vite-plugin-pwa` for the offline service worker. Hash routing, so
it works from any sub-path. No UI framework, no backend, no analytics.

Domain logic worth knowing about:

- `src/lib/money.ts` — Indian money parsing and formatting, the all-in cost
  model, EMI. Stamp duty applies on the DLC circle rate or the deal value,
  whichever is higher.
- `src/lib/negotiate.ts` — the negotiation estimator. Starts from a typical room
  for the property type, adds ticked leverage, and claims only part of any
  measured market premium (a locality average covers all stock, so a branded
  project sits above it for reasons that aren't negotiable). Calibrated against
  the researched figures and pinned there by a test.
- `src/lib/score.ts` — weighted scoring across 11 categories. Water and power
  carry the same weight as construction; amenities are deliberately weighted
  low, because you pay for their upkeep every month.
