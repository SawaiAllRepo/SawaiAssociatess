# Chatbot integration and backend contract

## Website integration

`src/App.jsx` renders one `<Chatbot />` after the footer and outside `<Routes>`. This keeps the launcher available across the site's routed pages without rendering it once per page. The existing chatbot component and CSS provide the responsive floating launcher and full-screen mobile chat window.

The widget now uses the backend-matched conversation UI from the copied chatbot project. The backend owns the qualification flow, consent step, and lead creation. The browser stores only the backend `session_id` and a convenience transcript; it does not store leads as the production record.

## Frontend configuration

Set `VITE_CHATBOT_API_BASE_URL` to the chatbot API origin, with no path suffix, in the website build environment. For example, use `https://chatbot-api.example.com`. The frontend appends the API paths documented below. `.env.example` contains a placeholder only.

Vite embeds every `VITE_*` value in public browser assets. Keep API tokens, database credentials, and admin credentials in the backend host's server-side environment only.

## Endpoints verified in the bundled FastAPI source

### Chat and lead qualification

`POST /chat` accepts a JSON object containing either a message or one of the backend's supported actions. The frontend sends a latest-turn message and the `session_id` returned by the previous response; it does not send a client-maintained `history` array.

Message request:

```json
{ "message": "I need health insurance", "session_id": "optional-session-id" }
```

Action request:

```json
{ "action": "consent_contact", "session_id": "session-id" }
```

The backend schema defines actions `back`, `main_menu`, `edit_details`, `edit_field`, `request_call`, `whatsapp`, and `consent_contact`; `target` is required for `edit_field`. A successful response is a `ChatResponse` object with `session_id`, `reply`, `mode`, `service`, `next_field`, `progress`, `qualification_complete`, `lead_created`, `lead_id`, `handoff_recommended`, `menu_options`, `summary`, and `actions`. The frontend uses `reply`, `session_id`, qualification summary/progress, and the returned menu/action options.

The backend flow collects contact consent before contact details when configured to require consent. It creates a lead through its backend domain/database flow after qualification; there is no public structured `POST /leads` endpoint in the source. Website contact forms still use their existing Google Apps Script integration separately.

### Analytics

`POST /analytics/event` accepts `event_type` (`chatbot_open`, `expert_request`, `call_request`, or `whatsapp_request`), optional `session_id`, and optional `service`. It returns HTTP 204. Analytics failures do not stop chat.

### Health

`GET /health` is the backend health check.

### Admin panel and lead APIs

The backend serves its static admin panel at `/admin`. Admin API calls require `Authorization: Bearer <ADMIN_API_TOKEN>`; the token must stay server-side/admin-user supplied and must never be added to Vite configuration. The panel's verified API calls include:

- `GET /admin/overview`
- `GET /admin/leads` (supports filters including `limit`, `status`, `service`, `priority`, `location`, `assigned_to`, `source`, `date_from`, and `date_to`)
- `GET /admin/leads/{lead_id}`
- `GET /admin/leads/{lead_id}/events`
- `GET /admin/leads/{lead_id}/conversation`
- `PATCH /admin/leads/{lead_id}/status` with `{ "status": "..." }`
- `PATCH /admin/leads/{lead_id}/assignment` with `{ "assigned_to": "..." }`
- `GET /admin/delivery-jobs` and `GET /admin/analytics`

The React website does not define an admin route. The backend's `/admin` panel remains served by the API service unless deployment routing is deliberately configured to expose it through the website domain.

## Persistence and deployment status

The copied backend source initializes SQLite tables for leads, sessions, lead events, and related records, and the backend admin API reads those records. The included deployment blueprint configures a persistent disk at `/var/data`. These are source/configuration findings only: no backend was running during this website build, so writes, durable storage across redeploys, and authenticated admin retrieval have not been tested against a deployed service.

Before publishing the chatbot, deploy the backend, configure its server-side model/admin secrets and durable database storage, set allowed website origins for CORS, then set `VITE_CHATBOT_API_BASE_URL` in the website host and rebuild. Verify `/health`, a consented test conversation that creates a lead, and retrieval in the protected `/admin` panel. Configure a website-domain proxy for the admin panel only if that URL is desired; it is not part of the React app routes.
