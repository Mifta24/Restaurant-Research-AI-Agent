# Restaurant Research Agent

Business-first Jakarta restaurant lead research agent for FTS.

## Google Sheet

Imported native Google Sheet:

https://docs.google.com/spreadsheets/d/1rwV6Q83zwZeWzxekFo3Qu9B3qC8hi5I6kEz7nEtim8s

## Apps Script Setup

### Option A: Bound from Google Sheet

1. Open the Google Sheet.
2. Go to `Extensions -> Apps Script`.
3. Paste `apps-script/Code.gs`.
4. In Apps Script, open `Project Settings -> Script properties`.
5. Add `WEBHOOK_SECRET` with the same value as `GOOGLE_SHEET_WEBHOOK_SECRET` in `.env`.
6. Deploy as `Web app`.
7. Set execute as yourself and access according to your preferred security setting.
8. Copy the Web App URL into `.env` as `GOOGLE_SHEET_WEBHOOK_URL`.

### Option B: Standalone Apps Script

Use this if `Extensions -> Apps Script` cannot open from the Sheet.

1. Open https://script.google.com/home/projects/create.
2. Paste `apps-script/Code.gs`.
3. In Apps Script, open `Project Settings -> Script properties`.
4. Add:
   - `SPREADSHEET_ID`: `1rwV6Q83zwZeWzxekFo3Qu9B3qC8hi5I6kEz7nEtim8s`
   - `WEBHOOK_SECRET`: same value as `GOOGLE_SHEET_WEBHOOK_SECRET` in `.env`
5. Deploy as `Web app`.
6. Set execute as yourself and access according to your preferred security setting.
7. Copy the Web App URL into `.env` as `GOOGLE_SHEET_WEBHOOK_URL`.

## Local Setup

```bash
npm install
npm run test:dummy
npm run batch
```

Default first batch:

- Areas: Kemang, Senopati, SCBD
- Limit: 50 leads
- AI notes: disabled until `ENABLE_AI_NOTES=true`

## Flow

```text
Node.js Agent -> Apps Script Webhook -> Lead List sheet
```
