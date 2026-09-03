# ACBN Grant Desk

A working memory for grant writing: what we've applied for, what we won, what
we said that worked, what's in flight right now, and what's worth going after
next.

The primary reader of this directory is **Claude**, not a browser. That's the
whole design rationale — see [Why files, not a database](#why-files-not-a-database).

## The four things this does

| | |
|---|---|
| **Learn** | Past applications become structured records + a reusable answer library, so a new application starts from our own proven language instead of a blank page. |
| **Monitor** | Every in-flight application has a stage, a deadline, and a watch config. Claude checks Gmail for funder replies, writes deadlines to the ACBN calendar, and produces a weekly brief. |
| **Triage** | Inbound opportunity flow (Peel Region, OTF, Pocketed, GPA, partner forwards) gets screened against real eligibility before it eats any of your time. |
| **Research** | Active prospecting for calls we'd qualify for, scored against our track record and capacity. |

## Layout

```
grants/
├── orgs/           Applicant profiles — ACBN and the client orgs we write for
├── funders/        Funder dossiers — what they fund, how they decide, our history with them
├── applications/   One file per application. THE pipeline. Front-matter = structured, body = narrative
├── opportunities/  Prospects not yet committed to: triage inbox + research findings
├── library/        Reusable narrative: voice, track record, impact stats, answer bank
├── scripts/        validate.mjs (schema check) and build-dashboard.mjs (renders the HTML view)
└── private/        Git-ignored. Credentials, signed agreements, anything not for the repo.
```

## The application record

Each file in `applications/` is markdown with YAML front-matter. Front-matter is
the machine-readable pipeline row; the body is what actually makes the record
worth having.

```yaml
---
id: esdc-canada-summer-jobs-2026
applicant: acbn                    # -> orgs/acbn.md
funder: esdc                       # -> funders/esdc.md
program: Canada Summer Jobs 2026
stage: submitted                   # see stages below
amount_requested: null
amount_awarded: null
deadline: null
submitted: 2026-01-15
confirmation: A001070969
watch:
  from_domains: [servicecanada.gc.ca]
  subject_terms: ["Canada Summer Jobs"]
needs_verification: [amount_requested, deadline]
---
```

**Stages** — `prospect` → `drafting` → `submitted` → `under_review` →
`awarded` | `declined` | `withdrawn`, then `reporting` → `closed`.

`awarded` is not the end. Reported-on money is the money that gets renewed, so
awards carry `reporting` entries and stay in the pipeline until `closed`.

**`needs_verification`** lists fields seeded from a source that wasn't
authoritative. Nothing in here is invented — a field we don't know is `null` and
named in this list. Read it as "don't quote this number to a funder yet."

## The answer library

`library/answers/` is the part that compounds. Each file is a reusable block —
mission framing, community need, org capacity, evaluation approach — written
once, refined every time a funder responds well to it, and cited by the
applications that used it.

When drafting, Claude pulls from here first and only writes new prose for what's
genuinely specific to the funder. That's how a 30-page application stops taking
three weeks.

## Why files, not a database

The business-card side of this repo uses SQLite behind a UI, and that's right
for contacts — short structured fields, entered once, queried often.

Grant writing is the opposite shape. The valuable content is *prose*: the
paragraph about community need that got a $500K yes. Claude reads and edits
markdown natively and can diff it across versions; a database row would need a
UI built for every field and couldn't be read at all without running code. Git
gives version history for free, which for grant narrative *is* the product —
you want to see how the mission paragraph evolved between the declined
application and the successful one.

The dashboard is a **generated view**, not the store. Records stay canonical.

## Commands

```bash
node grants/scripts/validate.mjs        # schema + referential integrity check
node grants/scripts/build-dashboard.mjs # renders grants/dashboard.html
```

## Ground rules

1. **No invented numbers.** Amounts, dates and outcomes come from a source, or
   they're `null` and listed in `needs_verification`.
2. **No credentials in git.** Portal logins are stored as the account email
   only. Passwords, tokens and signed agreements go in `private/`.
3. **One file per application**, even a two-line prospect. Splitting a record
   across places is how a deadline gets missed.
