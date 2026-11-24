# Sawai Associates — Chatbot leads in Google Sheets

## What was changed

- Existing contact enquiries still go to `Enquiries`.
- A confirmed backend chatbot lead (`lead_created=true`, with lead and session IDs) is mirrored to a new `Chatbot Leads` tab in the spreadsheet already configured in `google-apps-script/Code.gs`.
- Columns: SAVED_AT, LEAD_ID, SESSION_ID, SERVICE, NAME, PHONE, EMAIL, LOCATION, REQUIREMENT, OTHER_DETAILS, CONVERSATION, SOURCE.
- All available backend `summary` fields are preserved as JSON in OTHER_DETAILS, alongside the conversation snapshot.
- Unfinished/anonymous chat sessions are not stored as leads. The bot's existing backend remains the primary datastore.
- Duplicate lead IDs are suppressed persistently by Apps Script, with an additional browser-side success marker.

## REQUIRED deployment steps

1. Open the Google Apps Script project currently connected to the website contact form.
2. Replace its `Code.gs` with the **updated** `google-apps-script/Code.gs` from this package. Do not replace the spreadsheet or delete the `Enquiries` tab.
3. In the Apps Script editor, select `setupChatbotLeads` and click **Run**. Grant access. This creates the `Chatbot Leads` tab.
4. Deploy > **Manage deployments** > Edit (pencil) > choose **New version** > Deploy. Keep deployment access as required by the current contact form.
5. On the website deployment (Vercel), set `VITE_SHEETS_WEB_APP_URL` and `VITE_SHEETS_SHARED_SECRET` to the **same existing values** used for the contact form. Set `VITE_CHATBOT_API_BASE_URL` to the working chatbot backend URL. Redeploy the React website.
6. Run an end-to-end test with consent, answer all qualification questions and confirm backend creates a lead. Check `Chatbot Leads` for one row and compare it to the backend admin lead record. Also submit a regular contact enquiry to verify the older form still works.

## Important limitations and security

- This package does **not** contain the runnable FastAPI chatbot backend; its directory holds only a patch. Therefore a backend-side push for all lead events cannot be implemented or verified from this upload.
- The website can mirror only leads created while its active browser receives the `lead_created` response. For guaranteed A-to-Z lead capture (including retries after closing the browser), put the Sheets write on the chatbot backend at lead creation and run reconciliation for already-existing leads.
- Since Vite exposes `VITE_*` values publicly, the existing sheet secret is **not secret**. Avoid placing privileged credentials in the frontend; move writes to an authenticated backend/proxy for a production-grade integration. Existing contact form already uses this pattern. Restrict spreadsheet sharing and rotate exposed secrets when securing the backend.
- Apps Script must be redeployed; uploading this ZIP to Vercel **alone will not update Google Apps Script**.
- Names/phones are populated only if those fields appear in backend `summary`; otherwise the JSON details and conversation preserve the provided data. Prefer structured lead export from backend for complete, validated fields.
- This ZIP is source code only; no claim of actual Google Sheet write/testing against Google servers is made.
