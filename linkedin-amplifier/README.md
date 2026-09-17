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

## Getting your posts in

LinkedIn has no API for reading your own posts. It does let every member export them:

**Settings → Data Privacy → Get a copy of your data → tick "Posts" → request archive.**

The archive arrives by email (usually within 10 minutes for posts alone). Inside is `Shares.csv`. Drop that file into the importer on the **Voice** page and it becomes your writing samples — reshares without your own commentary and one-line congratulations are filtered out automatically, longest posts first. The file is parsed in memory and never stored; only the samples you save land in the database.

If you would rather not export, pasting posts by hand into the same box works identically.

## Content guardrails

`lib/guardrails.ts` holds hard rules injected into every generation prompt, above the voice spec and the format skeleton. They exist for mistakes that editing afterwards does not undo — the shipped set covers securities language, unconsented client stories, partisan politics, naming peer organisations critically, and invented numbers.

The securities rule matters most if you are raising through a regulated instrument: offering terms may only be communicated through the offering document and the registered portal, so no draft may state a rate, yield, return, term, or minimum. A post explaining what an instrument *is* and inviting people to an information session is fine; a post saying what it *pays* is a securities communication.

There is also a post-generation regex check (`flagSecuritiesRisk`) that flags any draft combining a financial term with investment language. It is a safety net, not the primary control, and it errs toward flagging. Flagged drafts carry a visible **COMPLIANCE FLAG** in the UI.

Edit the list to match your own situation before you generate anything.

## Setup

```bash
cp .env.example .env.local     # add your ANTHROPIC_API_KEY
npm install
npm run dev                    # http://localhost:3001
```

Everything is stored in a local SQLite file at `data/amplifier.db`. Nothing leaves your machine except the API calls to Claude (and Fireflies, if you connect it).

## Suggested first run

1. **Voice** → import `Shares.csv` (or paste 10–20 of your best posts) → *Extract voice spec* → read it critically and fix what's wrong → *Save & activate*. This step determines everything downstream; don't rush it.
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
- **Change the guardrails** in `lib/guardrails.ts`. These are yours to set — the defaults assume a regulated raise and a consent-sensitive client base.

## Seeding a voice profile and format library

If you already have a voice analysis you trust, skip extraction entirely — a hand-authored or professionally produced spec beats an extracted one. Extraction is the fallback, not the goal.

```bash
node scripts/seed-voice.mjs [path]      # default: data/ryan-voice.json
node scripts/seed-formats.mjs [path]    # default: data/ryan-formats.json
```

`seed-voice` takes `{ name, spec }` and makes the profile active, validating every required field first so a half-empty spec cannot silently become the constraint on all future drafts.

`seed-formats` replaces the built-in library with formats drawn from how you actually write, and **deactivates the built-ins by default**. That is deliberate: the generator picks by weight, and a generic shape that scores well on paper still reads like someone else. Pass `--keep-builtins` to leave them enabled at weight 0.4 instead. Nothing is deleted — re-enabling one is a single `UPDATE formats SET active = 1 WHERE id = '...'`.

Both scripts are idempotent; re-run them after editing the JSON.

### A note on format weights

Weights are a strategic judgement, not a transcription of past reach. A post type can have modest impressions and still deserve the highest weight — reach is partly a function of how the platform chose to distribute a post, whether it was boosted, and whether it tagged well-followed accounts. Weight the format you want more of, not the one that happened to travel.

## Seeding ideas from a file

```bash
node scripts/seed-ideas.mjs [path]      # default: data/starter-ideas.json
```

Takes a JSON array of `{title, raw_text, angle, audience, score, score_reason}`. Re-running skips titles that already exist, so you can append and re-seed. `data/starter-ideas.json` is git-ignored — personal material stays on your machine.
