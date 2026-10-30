<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/e1fb1401-afc3-4888-b5e8-f661cbec8de1

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Add `GEMINI_API_KEY`, `TELEGRAM_BOT_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, and `VITE_SUPABASE_URL` to the server environment. Never use a `VITE_` prefix for the Gemini or service role key.
3. Run [the OCR quota migration](supabase/migrations/20261030_system_ocr_rate_limit.sql) once in Supabase SQL Editor.
4. Set `OCR_SYSTEM_RPM` to a value below the active RPM limit for `OCR_GEMINI_MODEL` in Google AI Studio. The defaults are 10 and `gemini-3.5-flash-lite`. An existing `gemini-2.5-flash-lite` setting is automatically mapped to `gemini-3.5-flash-lite` because new projects cannot use the older model. The quota is global across Vercel instances and counts each call to Gemini, not each button click.
5. Deploy to Vercel with these environment variables in **Production**, then redeploy. OCR is available to Admin/HR accounts when the Mini App is opened through Telegram. The local Vite server alone does not serve `/api/ocr`; use `vercel dev` for a local end-to-end check.

The personal Gemini key is optional. If entered, it is stored in that browser and sent to `/api/ocr` for the scan. The backend uses it instead of the system key. A previously deployed `VITE_GEMINI_API_KEY` should be removed from Vercel and its Gemini key rotated because it may have been bundled into public JavaScript.
