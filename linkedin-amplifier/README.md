# LinkedIn Amplifier

A personal LinkedIn content engine. Six parts, wired into a loop:

1. **Voice** — extract a structured spec from posts you've written, then use it as a hard constraint on everything generated.
2. **Ideas** — mine your own meeting transcripts, scan news feeds, capture stray thoughts. Most raw material gets rejected.
3. **Formats** — 20 proven post skeletons. An idea poured into a shape beats an idea handed to a model raw.
4. **Drafts** — several variants per idea, each with the model's own honest critique of its weakest point.
5. **Queue** — approve, schedule, copy, publish.
6. **Performance** — log the numbers; formats that earn engagement get offered more often next time.

## Why it's built this way

**The output quality lives in the voice spec and the format library, not the generator.** Any model can write a LinkedIn post. What makes the output usable is (a) a concrete description of how *you* write, including what you never do, and (b) a real structural spine for the post. Both are hand-editable, because your corrections are better than the model's guesses.

**Ideas come from your own material first.** Generic AI content sounds generic because its only input is trending news. Your sales calls and client meetings contain explanations you've already delivered well — that's raw material nobody else has. Transcript mining strips identifying details and keeps the substance.

**It does not post for you.** LinkedIn's API grants auto-posting only through an app-review process, and it exposes *no* analytics for personal-profile posts at all — organization pages only. So publishing is copy-and-paste, and stats are entered by hand. That's ~45 seconds per post, and it's what makes the feedback loop possible at all. No browser automation, no ToS risk to your account.

**The feedback loop is deliberately cautious.** Format weights move only a third of the way toward the observed ratio, ignore any format with fewer than two measured posts, and clamp to 0.25×–3×. With single-digit sample sizes, a confident update is a wrong one.

## Setup

```bash
cp .env.example .env.local     # add your ANTHROPIC_API_KEY
npm install
npm run dev                    # http://localhost:3001
```

Everything is stored in a local SQLite file at `data/amplifier.db`. Nothing leaves your machine except the API calls to Claude (and Fireflies, if you connect it).

## Suggested first run

1. **Voice** → paste 10–20 of your best posts → *Extract voice spec* → read it critically and fix what's wrong → *Save & activate*. This step determines everything downstream; don't rush it.
2. **Ideas** → set your expertise line → paste a recent sales call transcript → *Mine for ideas*.
3. Pick a high-scoring idea → *Write posts* → pick 3 formats → generate.
4. **Drafts** → read the model's self-critique on each, keep one, edit it until it's actually yours, approve.
5. **Queue** → copy → post to LinkedIn → *Mark posted*.
6. Three days later: **Performance** → log the numbers. After ~6 measured posts, *What's working?* starts being worth reading.

## Fireflies

Set `FIREFLIES_API_KEY` and recent meetings appear under **Ideas → Meetings** with a one-click *Mine* button. Without it, paste transcripts into the box below — identical results.

## Tech

Next.js 14 (App Router), TypeScript, Tailwind, SQLite via `better-sqlite3`, Claude API. No other services, no accounts, no hosting required.

## Extending it

- **Add formats** in `lib/formats.ts`. Seeding is by stable id, so new entries appear on next boot and existing weights survive.
- **Change the writing rules** in the `WRITE_SYSTEM` prompt in `lib/drafts.ts` — that's where the banned-phrase list lives.
- **Change the idea bar** in `MINING_SYSTEM` in `lib/ideas.ts` if too much or too little is getting through.
