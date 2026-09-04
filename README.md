# Finance Cockpit

A polished, fictional FP&A interview prototype inspired by the public nexos.ai Finance Director mandate. It demonstrates how commercial assumptions can flow through a transparent finance model into management decisions. It is independent and does not represent nexos.ai data or architecture.

## Run locally

Install dependencies, then run `npm run dev`. Build the production version with `npm run build`.

## Architecture

- `app/page.tsx` contains the three responsive views and their interactions.
- `app/lib/finance.ts` contains seeded data and deterministic modelling functions.
- There is no database, authentication, external API, AI call, or real company data.

## Calculation assumptions

- Subscription revenue is recognised straight-line over the service period.
- Implementation fees are flagged for judgement and not automatically recognised.
- Monthly burn is annual cash outflow less forecast revenue, divided by 12 and floored at zero.
- Runway is current cash divided by monthly burn; cash-generative cases avoid division by zero.
- Each planned hire carries a fictional €110,000 annual fully loaded cost.

## Deployment

The app is ready for a standard Next.js-compatible deployment. Import the repository into Netlify or Vercel and use the default build settings.

## 90-second demo

1. Open Executive Cockpit. Frame the six metrics as the leadership view of growth, accounting performance, liquidity, burn, runway, and operating scale.
2. Open Revenue Bridge. Show that contracted value, invoicing, recognised revenue, deferred revenue, and cash are separate financial states.
3. Open Scenario Planner. Select Downside or move growth down and hiring up. Explain how the deterministic model converts the assumptions into burn and runway.
4. Close on the management implication: the model matters because it makes a leadership trade-off visible, not merely because it produces a forecast.
