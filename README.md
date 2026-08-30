# Business Card Organizer

Take a photo of a business card, get the contact details extracted automatically,
search your saved contacts, share any of them as a vCard, and push a contact into
GoHighLevel so your existing workflows (keep-in-touch emails, stale-lead reminders)
can take over.

## How it's scoped

This is a **single-user capture tool**, not a CRM. It does one job well — get a
card photo into a structured, searchable contact — and hands off to GoHighLevel
for anything about ongoing relationship/engagement tracking, so there's one
source of truth for "who responded" and "who needs a nudge," not two.

- **Capture** — photo (camera or upload) or manual entry.
- **Extract** — the photo is sent to Claude's vision API, which returns structured
  fields (name, title, company, email, phone, website, address, notes). No
  separate OCR vendor/API key needed.
- **Review & save** — you confirm/edit the extracted fields before saving.
- **Search** — contacts are stored in a local SQLite database with full-text-ish
  search across name, company, title, and email.
- **Share** — every contact can be downloaded as a `.vcf` (vCard) file.
- **Sync to GoHighLevel** — one click pushes/upserts the contact into your GHL
  sub-account, tagged `business-card-scan`. Build a GHL workflow on that tag to
  handle the actual email campaign and "no response in N days" follow-up task —
  this app doesn't duplicate that logic.

## Tech stack

| Layer    | Tech                                      |
|----------|--------------------------------------------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Card OCR | Claude API (vision)                        |
| Storage  | SQLite (`better-sqlite3`) + card images on local disk |
| CRM sync | GoHighLevel API v2 (Private Integration Token) |

## Getting started

```bash
cp .env.example .env.local
# fill in ANTHROPIC_API_KEY (required)
# fill in GHL_PRIVATE_TOKEN and GHL_LOCATION_ID (optional — sync button is
# disabled with a clear error until these are set)

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Getting a GoHighLevel API token

1. Log into the **sub-account/location** you want contacts created in.
2. Go to **Settings → Private Integrations**.
3. Create a new integration with scopes `contacts.write` and `contacts.readonly`.
4. Copy the generated token (starts with `pit-...`) into `GHL_PRIVATE_TOKEN`.
5. Copy the Location ID (Settings → Business Profile) into `GHL_LOCATION_ID`.

This uses GHL's current API (v2, `services.leadconnectorhq.com`), not the legacy
JWT API key under Business Info — that one is being phased out.

## Project structure

```
app/
├── page.tsx                        # Capture flow (photo -> extract -> review -> save)
├── contacts/page.tsx                # Search + list
├── contacts/[id]/page.tsx           # Detail: edit, share vCard, sync to GHL, delete
└── api/
    ├── parse-card/route.ts          # Claude vision extraction
    ├── cards/route.ts               # List/search + create
    ├── cards/[id]/route.ts          # Get/update/delete
    ├── cards/[id]/vcard/route.ts    # vCard download
    └── cards/[id]/sync-ghl/route.ts # Push contact to GoHighLevel
components/
├── CardCapture.tsx                  # Photo capture + extraction + save flow
└── ContactForm.tsx                  # Shared editable contact fields
lib/
├── db.ts           # SQLite schema/connection
├── cards.ts        # Contact CRUD
├── parseCard.ts     # Claude vision card parsing
├── ghl.ts           # GoHighLevel upsert
├── vcard.ts         # vCard generation
└── types.ts         # Shared form types
```

## Deployment note

Contact images and the SQLite database are stored on local disk, so this needs
a host with a **persistent filesystem** (a small VPS, Railway, Render, Fly.io,
etc.) — not a stateless serverless platform like Vercel, where the filesystem
resets between requests. If you outgrow this, the natural next step is Postgres
+ object storage (S3/R2) for images, without changing the app's shape.

## Ingesting cards from a Google Drive folder (via Make.com)

If you'd rather drop a photo into a Google Drive folder than use your phone, the
app exposes `POST /api/cards/from-drive` for exactly that. It skips the review
step (there's no human in the loop), so cards from this route are saved with
`source: "google-drive"` and are **not** auto-synced to GHL — they show up in
the Contacts list tagged "Needs review" so you can check the extraction and
sync manually, same as any other contact.

Set `DRIVE_INGEST_SECRET` in your deployment's environment variables (any
random string) — the endpoint 401s without the matching `x-ingest-secret`
header, since it would otherwise be a public unauthenticated write endpoint.

Build the automation in Make.com:
1. **Trigger:** Google Drive → *Watch Files in a Folder* (the folder you'll drop cards into).
2. **Module:** Google Drive → *Download a File* (get the file content).
3. **Module:** HTTP → *Make a Request* — `POST` to `https://<your-app>/api/cards/from-drive` with header `x-ingest-secret: <your secret>` and a JSON body of `{ "image": "<base64 file content>", "mediaType": "<file mime type>" }`.
4. **Module:** Google Drive → *Move a File* — move the processed file into a "Processed" subfolder so it isn't picked up again on the next poll.

## Setting up the GoHighLevel side

This app only creates/updates the contact and tags it `business-card-scan`.
Build these as GHL workflows against that tag:

1. **Keep-in-touch campaign** — triggered on tag added, sends a periodic email
   sequence.
2. **Follow-up reminder** — a wait step (e.g. 7 days) followed by a condition
   checking engagement/reply, then a task/notification to you if there's been
   no response.

## Roadmap ideas (not built yet)

- Multi-user accounts/sharing, if this ever needs to be a team tool.
- Duplicate-contact detection when scanning the same person twice.
- Bulk import/export.
- Swap local SQLite/disk for Postgres + blob storage for serverless deployment.
