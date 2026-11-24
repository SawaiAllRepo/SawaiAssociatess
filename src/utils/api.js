
const WEB_APP_URL = (import.meta.env.VITE_SHEETS_WEB_APP_URL || "").trim() ||
  "https://script.google.com/macros/s/AKfycbzo6-6-Z9X3dvnH5w2RvaRC_pCkZBjpSvCLMSADYeR1Nn36DxLq0o9io_NsCQu1ArLMgw/exec";
const SHARED_SECRET = (import.meta.env.VITE_SHEETS_SHARED_SECRET || "").trim() ||
  "SawaiEnquiry7kQ29mL6p";
const REQUEST_TIMEOUT_MS = 30000;
const RECENT_KEY = "sawai_submitted_enquiries";

function fingerprint(data) {
  return [data.form_type, data.full_name, data.mobile_number, data.email]
    .map(value => String(value || "").trim().toLowerCase()).join("|");
}

function recent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || {}; }
  catch { return {}; }
}

function remember(key) {
  try {
    const now = Date.now();
    const previous = Object.fromEntries(Object.entries(recent()).filter(([, time]) => now - time < 86400000));
    localStorage.setItem(RECENT_KEY, JSON.stringify({ ...previous, [key]: now }));
  } catch { /* Private browsing may prevent local storage. */ }
}

function checkSaved(id, attempt) {
  return new Promise((resolve, reject) => {
    const callback = `sawaiConfirm_${id.replaceAll("-", "")}_${attempt}`;
    const script = document.createElement("script");
    const timer = setTimeout(() => finish(new Error("Unavailable")), 2500);
    function finish(error, result) {
      clearTimeout(timer);
      delete window[callback];
      script.remove();
      if (error) reject(error);
      else resolve(result);
    }
    window[callback] = result => finish(null, result);
    script.onerror = () => finish(new Error("Unavailable"));
    script.src = `${WEB_APP_URL}?id=${encodeURIComponent(id)}&callback=${callback}`;
    document.head.append(script);
  });
}

async function confirmSaved(id) {
  for (let attempt = 0; attempt < 8; attempt++) {
    if (attempt) await new Promise(resolve => setTimeout(resolve, 600));
    try {
      const result = await checkSaved(id, attempt);
      if (result?.saved) return true;
      if (result?.error) throw new Error("Submission rejected");
    } catch (error) {
      if (error?.message === "Submission rejected") throw error;
    }
  }
  return false;
}

export async function submitEnquiry(payload) {
  if (!WEB_APP_URL || !SHARED_SECRET) {
    throw new Error("Enquiry is temporarily unavailable. Please contact us directly.");
  }
  const key = fingerprint(payload);
  if (Date.now() - (recent()[key] || 0) < 60000) {
    throw new Error("You have already sent an enquiry. Please wait a moment.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const id = crypto.randomUUID();
  const requestBody = JSON.stringify({ secret: SHARED_SECRET, type: "contact", data: payload, id });
  try {
    // Apps Script does not expose a CORS response to a different website.
    // Send once without that failing CORS round trip, then confirm the save.
    // A failed browser response can still mean the POST reached Google.
    try {
      await fetch(WEB_APP_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: requestBody,
        signal: controller.signal,
      });
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
    }
    if (await confirmSaved(id)) {
      remember(key);
      return { success: true };
    }
    // Never show success for an opaque POST without confirmation from Apps Script.
    throw new Error("Unable to send your enquiry right now. Please try again later.");
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("This is taking longer than expected. Please try again later.");
    }
    if (error instanceof TypeError) {
      throw new Error("Unable to send your enquiry right now. Please try again later.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
