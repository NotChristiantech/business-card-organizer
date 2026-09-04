---
name: grants
description: ACBN grant desk — draft applications from the answer library, run the weekly pipeline brief, watch Gmail for funder replies, sync deadlines to calendar, triage inbound opportunities, and research new funding. Use whenever the user mentions a grant, funder, application, deadline, RFP, funding opportunity, LOI, or a named funder (ESDC, FedDev, FFBC, OTF, Vancity, SBCCI, Peel Region, Public Safety Canada, RBC Foundation), or asks what's due, what's in flight, or what to apply for next.
---

# ACBN Grant Desk

The knowledge base is `grants/`. Read `grants/README.md` for the layout and
`grants/orgs/acbn.md` for who ACBN is before doing anything substantive.

## Non-negotiables

1. **Never invent a number, date or outcome.** Amounts, deadlines and results
   come from a source or they are `null` and listed in the record's
   `needs_verification`. A fabricated figure in a submitted application is
   career damage for Ryan, not a bug.
2. **Never write a field listed in `needs_verification` into application prose.**
3. **Never commit credentials.** Portal accounts are stored as the email only.
   Passwords, tokens and signed agreements go in `grants/private/` (git-ignored).
4. **Update the record when reality changes.** A stage change, a funder reply, a
   confirmed amount — write it to the file in the same turn you learn it.
   A tracker that lags reality is the problem this system exists to fix.
5. **Ryan approves before anything leaves.** Never send an email to a funder,
   submit an application, or post to a portal without explicit confirmation.
   Drafts and calendar entries are fine unprompted; outbound contact is not.

## Ingesting past applications

The archive is `$ Grants and Sponsorship` in Drive
(`1lb8rwjmLgBUzHY4H0MZaUCpCIOlODS0h`) — roughly 85 folders spanning 2019–2026.
`grants/corpus-index.md` lists every one with its Drive ID and a status, so the
work is resumable across sessions.

When asked to ingest, or when there's slack to do it:

1. Take the next `todo` item in priority order from `corpus-index.md`.
2. List the folder; read the application narrative, budget, and any decision or
   reporting correspondence.
3. Update `applications/` and `funders/`.
4. **Lift every reusable answer into `library/answers/`.** This is the point —
   the application record is bookkeeping, the answer bank is the asset.
5. Record the outcome, and the reason if declined.
6. Mark the row `done`.

Ingest a few folders per session rather than attempting the whole archive. Report
what changed in the library, not a folder-by-folder narration.

## Drafting an application

1. **Check `library/eligibility.md` first.** ACBN is a *non-charitable*
   not-for-profit — it is not a qualified donee and cannot receive grants from
   funders that require one, which rules out much of the foundation market.
   Confirm entity, geography, charitable requirement and deadline before
   reading the guidelines properly.
2. Read the funder dossier (`grants/funders/<id>.md`) and the applicant profile
   (`grants/orgs/<id>.md`). Use the legal applicant name from `orgs/<id>.md`,
   which is not always the operating name.
3. **Read `library/win-loss-analysis.md`.** ACBN wins formula-assessed programs
   and mandate-explicit Black-economy programs; it loses competitively scored
   applications where outcome evidence decides, and programs requiring its work
   to be reframed into an adjacent agenda. If the one being drafted is in a
   losing category, say so before writing 30 pages.
4. Read the funder's actual guidelines. Extract the questions verbatim and the
   scoring rubric if published.
5. For each question, find the matching block in `grants/library/answers/` by
   `question_types`. Adapt — match their vocabulary, hit their word count,
   foreground the pillar they fund. Never paste unchanged.
6. Pull evidence from `library/track-record.md` and `library/reach-and-impact.md`.
   Follow the deployment guidance in track-record.md — the argument changes with
   the size of the ask.
7. For any federal call touching gender or equity, read `library/gba-plus.md`.
   GBA Plus is the government's required analytical frame, WAGE owns it, and
   applications are scored on it. Its intersectional construction is why ACBN's
   Black-and-women positioning is a strength rather than a stretch.
8. For a needs statement, pull from `library/research/evidence-base.md` (external
   authority) and `library/research/acbn-own-research.md` (ACBN's own survey,
   the Ontario Public Service labour market assessment, and the Gibbs & Knight
   policy response). National statistic, then ACBN's primary data, then a
   concrete instance of harm.
9. For anything ecosystem-, capacity- or equity-shaped, open from
   `library/theory-of-change.md`. That Afrocentric-paradigm argument is ACBN's
   most distinctive asset and it carried the $1.315M Ecosystem Fund. Name
   delivery partners from `library/partners.md`, confirming each is still active
   first.
10. Follow `library/voice.md`. Claim, evidence, mechanism, stakes.
11. Write the application record in `grants/applications/` as you go, not after.
12. Flag every place the application needs a number ACBN doesn't have. Do not
   paper over the gap.

After a decision lands — either way — return to the record and write the outcome
and the reason. **A recorded decline reason is worth more than the application
was.** Then update the funder dossier's Lessons section and any answer block the
funder responded to.

## Weekly status brief

Run Monday mornings, or whenever asked "what's happening with grants."

1. Read all of `grants/applications/`.
2. Regenerate the dashboard: `node grants/scripts/build-dashboard.mjs`
3. Report, in this order:
   - **Due in 30 days** — deadline, applicant, what's left to write
   - **Overdue or ambiguous** — passed deadlines with unclear status; these are
     the ones that quietly rot
   - **Gone quiet** — `submitted` or `under_review` with no funder contact in
     45+ days
   - **Reporting due** on awarded money — this is what protects renewals
   - **Needs a decision from Ryan** — blocking questions, one line each
   - **New opportunities** since last brief, with verdicts
4. Lead with what changed since the last brief. Do not re-list a static pipeline
   — a brief that reads the same every week gets ignored, and then the one week
   it matters gets ignored too.

## Gmail watch

Each record's `watch:` block carries `from_domains` and `subject_terms`.

1. Search Gmail for open applications' watch terms since the last check.
2. Classify each hit: acknowledgement, information request, decision, reporting
   reminder, or noise.
3. Update the record — stage, decision, dates — and note the thread.
4. Surface anything needing a reply.

Note the funder-specific baseline in `funders/esdc.md`: ESDC does not send useful
acknowledgements, so inbox silence there is not a signal the way it is for a
foundation. Don't raise a false alarm.

**Read-only.** Never reply to a funder without Ryan's explicit approval.

## Calendar sync

Write to `ryan.knight@acbncanada.com` (his ACBN calendar).

For each application with a known `deadline`:
- **T-30** — "Start drafting: <funder> <program>"
- **T-14** — "Draft due: <funder> <program>"
- **T-7** — "Final review: <funder> <program>"
- **Deadline day** — "SUBMIT: <funder> <program>"

Also create events for reporting due dates on awarded grants. Check for an
existing event before creating one — duplicate deadline events train people to
ignore deadline events.

## Opportunity triage

New opportunity arrives (digest, partner forward, funder email):

1. Screen against the seven questions in `grants/opportunities/README.md`. The
   first four are disqualifiers — check them before reading the guidelines
   properly.
2. Write a dated entry in `opportunities/inbox.md` with a verdict: `pursue`,
   `watch`, `pass` (with the reason), or `client`.
3. On `pursue`, create the application record with `stage: prospect`.

Be genuinely willing to say `pass`. ACBN's constraint is Ryan's time, not the
supply of open calls, and a recorded pass reason stops the same call being
re-litigated next year.

Watch for **collision**: when ACBN and its client orgs would apply into the same
envelope, they compete with each other. Flag it before anyone drafts.

## Funder research

Follow `grants/opportunities/research/README.md`. Sweep the source list, screen
findings, write a dated file, promote the good ones to the inbox.

Weight toward the standing priorities in that file — multi-year core funding,
renewals of what already works, housing capital, and anything that funds
evaluation infrastructure. Those are where ACBN's actual gaps are, which is
different from where the open calls are.

## Client work

Most applications here have an `applicant` that is not ACBN. When working on
one, read that org's profile and use *their* track record and reach, not ACBN's.
The credential ACBN brings is having written the application; the applicant is
the client.

## Maintenance

- Anything learned about a funder goes in their dossier's Lessons, not just the
  application record. Applications are one-offs; the dossier compounds.
- New numbers about ACBN go in `library/reach-and-impact.md` with a source and
  date, so two applications never contradict each other.
- When a `needs_verification` item is resolved, remove it from the list and fill
  the field in the same edit.
- Run `node grants/scripts/validate.mjs` after bulk edits.
