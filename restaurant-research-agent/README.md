# Restaurant Research Agent

Business-first Jakarta restaurant lead research agent for FTS.

## Agents

- Agent 1: Restaurant research and lead scoring batch agent.
- Agent 2: Restaurant diagnosis analyst agent.
- Agent 3: Sales message copywriter agent.
- Agent 4: Follow-up reply classifier and next-action agent.

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

## Agent 3: Sales Message Agent

Agent 3 runs after the restaurant has been scored and diagnosed. Its job is to create natural outreach copy that feels personal and professional, not hard selling.

It creates message variants for:

- WhatsApp message in Indonesian
- Instagram DM in Indonesian
- Email subject and body in Indonesian
- WhatsApp message in English
- Instagram DM in English
- Email subject and body in English

The messages use the available lead and diagnosis signals only. The agent should not invent ratings, revenue, traffic, Google Maps reviews, or reputation claims that are not in the collected data.

The output is sent to the Google Sheet tab `Sales Messages`. If the tab does not exist, the Apps Script webhook creates it with these columns:

- `No`
- `Created At`
- `Lead ID`
- `Restaurant Name`
- `Recommended FTS Service`
- `Personalization Signal`
- `Outreach Angle`
- `WhatsApp ID`
- `Instagram DM ID`
- `Email Subject ID`
- `Email Body ID`
- `WhatsApp EN`
- `Instagram DM EN`
- `Email Subject EN`
- `Email Body EN`

Configure `.env`:

```bash
ENABLE_SALES_MESSAGE_AGENT=true
SALES_MESSAGE_USE_AI=true
SALES_MESSAGE_MODEL=openai/gpt-4o-mini
SALES_MESSAGE_FALLBACK_MODEL=
SALES_MESSAGE_MAX_LEADS=20
```

`SALES_MESSAGE_USE_AI=false` or a missing `OPENROUTER_API_KEY` will use the local fallback message generator, so the workflow can still produce usable outreach drafts.

Run a local Agent 3 test:

```bash
npm run test:sales-message -- "Dummy Jakarta Restaurant"
```

Run a batch with diagnosis and sales messages enabled:

```bash
npm run batch
```

After changing `apps-script/Code.gs`, redeploy the Apps Script web app so the Sheet webhook can write to `Sales Messages`.

## Agent 4: Follow-up Agent

Agent 4 runs after a restaurant replies to outreach. Its job is to keep the sales process tidy by classifying the reply and creating the next recommended action.

It classifies replies into:

- `Interested`: the restaurant asks for details, pricing, packages, or a proposal
- `Contact Later`: the restaurant asks to continue later, such as next week or next month
- `Not Interested`: the restaurant declines, asks to stop, or says they already have a solution
- `Need Meeting`: the restaurant asks for or implies a meeting, call, demo, or schedule

The agent reads reply text from these lead fields, in order:

- `customerReply`
- `replyText`
- `latestReply`
- `replyNotes`

The output is sent to the Google Sheet tab `Follow Up Actions`. If the tab does not exist, the Apps Script webhook creates it with these columns:

- `No`
- `Created At`
- `Lead ID`
- `Restaurant Name`
- `Reply Received At`
- `Reply Text`
- `Classification`
- `Recommended Action`
- `Next Message`
- `Reminder Date`
- `Confidence`
- `Reason`

Example behavior:

```text
Reply: Boleh, kirim detailnya.
Classification: Interested
Next action: Send package details and offer a short meeting.
```

```text
Reply: Mungkin bulan depan.
Classification: Contact Later
Next action: Create a reminder and follow up near the requested time.
```

Configure `.env`:

```bash
ENABLE_FOLLOW_UP_AGENT=true
FOLLOW_UP_USE_AI=true
FOLLOW_UP_MODEL=openai/gpt-4o-mini
FOLLOW_UP_FALLBACK_MODEL=
FOLLOW_UP_MAX_LEADS=20
FOLLOW_UP_TEMPERATURE=0.2
FOLLOW_UP_MAX_TOKENS=800
```

`FOLLOW_UP_USE_AI=false` or a missing `OPENROUTER_API_KEY` will use the local fallback classifier, so reply classification still works for common Indonesian and English responses.

Run a local Agent 4 test:

```bash
npm run test:follow-up -- "Boleh, kirim detailnya."
npm run test:follow-up -- "Mungkin bulan depan."
```

Run a batch with follow-up enabled:

```bash
npm run batch
```

Only leads with reply text are processed by Agent 4. After changing `apps-script/Code.gs`, redeploy the Apps Script web app so the Sheet webhook can write to `Follow Up Actions`.

## Flow

```text
Node.js Agent -> Apps Script Webhook -> Lead List sheet
```

```text
Collected Restaurant Lead -> Diagnosis Agent -> Google Sheet diagnosis columns
```

```text
Diagnosed Restaurant Lead -> Sales Message Agent -> Google Sheet outreach message variants
```

```text
Replied Restaurant Lead -> Follow-up Agent -> Google Sheet reply classification and next action
```
