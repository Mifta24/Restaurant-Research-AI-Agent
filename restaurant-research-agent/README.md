# Restaurant Research Agent

Business-first Jakarta restaurant lead research agent for FTS.

## Agents

- Agent 1: Restaurant research and lead scoring batch agent.
- Agent 2: Restaurant diagnosis analyst agent.

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

## Agent 2: Restaurant Diagnosis Agent

Agent 2 runs after restaurant data is collected and scored. Its job is to diagnose the restaurant's current digital marketing condition, not just list the restaurant name.

It checks the available lead signals:

- website presence and whether the website signal looks weak
- Instagram availability
- WhatsApp or phone availability
- location clarity
- menu, reservation, website quality, and branding gaps that still need manual review

The diagnosis is sent to the Google Sheet tab `Diagnosa Report`. If the tab does not exist, the Apps Script webhook creates it with these columns:

- `No`
- `Created At`
- `Lead ID`
- `Restaurant Name`
- `Current Situation`
- `Main Problem`
- `Improvement Suggestion`
- `Recommended FTS Service`
- `Priority`

The package recommendation is also stored on the lead as `recommendedService`, and the diagnosis priority updates `priority`.

Output format:

```text
Restaurant Name:
Current Situation:
Main Problem:
Improvement Suggestion:
Recommended FTS Service:
Priority:
```

Recommended FTS service values:

- `Basic`: for restaurants that need a landing page or simple website
- `Middle`: for restaurants that need website improvement, WhatsApp flow, and basic AI response
- `Premium`: for restaurants ready for AI chatbot, reservation system, and broader automation

Configure `.env`:

```bash
OPENROUTER_API_KEY=your-project-testing-key
ENABLE_DIAGNOSIS_AGENT=true
DIAGNOSIS_USE_AI=true
DIAGNOSIS_MODEL=openai/gpt-4o-mini
DIAGNOSIS_FALLBACK_MODEL=
DIAGNOSIS_MAX_LEADS=20
```

Run a local diagnosis test:

```bash
npm run test:diagnosis -- "Dummy Jakarta Restaurant"
```

Run a batch with diagnosis enabled:

```bash
npm run batch
```

After changing `apps-script/Code.gs`, redeploy the Apps Script web app so the Sheet webhook can write to `Diagnosa Report`.

## Flow

```text
Node.js Agent -> Apps Script Webhook -> Lead List sheet
```

```text
Collected Restaurant Lead -> Diagnosis Agent -> Google Sheet diagnosis columns
```
