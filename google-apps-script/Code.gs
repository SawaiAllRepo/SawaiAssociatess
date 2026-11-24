/*
 * SAWAI ASSOCIATES
 * Contact Form + Chatbot Leads
 *
 * Contact form remains on its original spreadsheet.
 * Chatbot leads use a separate spreadsheet.
 *
 * IMPORTANT:
 * The chatbot POST route below is for initial integration
 * testing only. It is NOT authenticated.
 * Before production, move chatbot submissions to a
 * server-side authenticated integration.
 */

// ==========================================
// CONFIGURATION
// ==========================================

// Existing Contact Form Google Sheet
const SPREADSHEET_ID = "1SwJ2CiqWQpjZ_mP_a4sf_I19bUTBxEQBU3_vfEkqNJs";

// Contact form secret.
// Store the actual value in Apps Script Properties
// as CONTACT_FORM_SECRET.
const TAB_NAME = "Enquiries";

// Chatbot Google Sheet
const CHATBOT_SPREADSHEET_ID = "1bDnekCAOHO_ec5WVk4Sq3RecUeBul7bYYTE2uhpfic8";

const CHATBOT_TAB_NAME = "Chatbot Leads";

const HEADERS = [
  "ID",
  "FULL_NAME",
  "MOBILE_NUMBER",
  "EMAIL",
  "SERVICE",
  "PROPERTY_TYPE",
  "REQUIREMENT_AND_MESSAGE",
  "CREATED_AT",
];

const CHATBOT_HEADERS = [
  "SAVED_AT",
  "LEAD_ID",
  "SESSION_ID",
  "SERVICE",
  "NAME",
  "PHONE",
  "EMAIL",
  "LOCATION",
  "REQUIREMENT",
  "OTHER_DETAILS",
  "CONVERSATION",
  "SOURCE",
];

const SERVICES = ["Real Estate", "Insurance", "IT Services"];

// ==========================================
// HELPERS
// ==========================================

function reply_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function safeText_(value, maxLength = 2000) {
  const text = String(value ?? "")
    .trim()
    .slice(0, maxLength);

  // Prevent spreadsheet formula injection.
  return /^[=+@\-]/.test(text) ? "'" + text : text;
}

function combined_(requirement, message) {
  const detail = String(requirement || "").trim();
  const note = String(message || "").trim();

  return detail && note
    ? "Requirement: " + detail + "\nMessage: " + note
    : detail || note;
}

// ==========================================
// CONTACT FORM HEADER CHECK
// ==========================================

function checkHeaders_(sheet) {
  if (!sheet || sheet.getLastRow() === 0) {
    throw new Error("Run setupEnquiryColumns before accepting enquiries.");
  }

  const current = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];

  if (HEADERS.some((label, index) => current[index] !== label)) {
    throw new Error("Enquiries columns changed. Run setupEnquiryColumns.");
  }
}

// ==========================================
// CONTACT FORM SETUP
// ==========================================

function setupEnquiryColumns() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  const sheet = ss.getSheetByName(TAB_NAME) || ss.insertSheet(TAB_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);

    sheet.setFrozenRows(1);
    return;
  }

  const oldFourteen =
    sheet.getLastRow() && sheet.getRange(1, 2).getValue() === "FORM_TYPE";

  const oldNine =
    sheet.getLastRow() && sheet.getRange(1, 7).getValue() === "REQUIREMENT";

  if (oldFourteen || oldNine) {
    sheet
      .copyTo(ss)
      .setName(
        "Enquiries backup " +
          Utilities.formatDate(
            new Date(),
            Session.getScriptTimeZone(),
            "yyyyMMdd-HHmmss",
          ),
      );

    const count = sheet.getLastRow() - 1;

    if (count > 0) {
      const old = sheet.getRange(2, 1, count, oldFourteen ? 14 : 9).getValues();

      const rows = old.map((row) =>
        oldFourteen
          ? [
              row[0],
              row[2],
              row[3],
              row[4],
              row[5],
              row[6],
              combined_(row[7], row[12]),
              row[13],
            ]
          : [
              row[0],
              row[1],
              row[2],
              row[3],
              row[4],
              row[5],
              combined_(row[6], row[7]),
              row[8],
            ],
      );

      sheet.getRange(2, 1, count, 8).setValues(rows);

      sheet.getRange(2, 9, count, oldFourteen ? 6 : 1).clearContent();
    }

    sheet.getRange(1, 1, 1, 8).setValues([HEADERS]);

    if (sheet.getMaxColumns() > 8) {
      sheet.deleteColumns(9, sheet.getMaxColumns() - 8);
    }
  }

  checkHeaders_(sheet);

  if (sheet.getFrozenRows() !== 1) {
    sheet.setFrozenRows(1);
  }

  const count = sheet.getLastRow() - 1;

  if (count > 0) {
    const values = sheet.getRange(2, 1, count, 1).getValues();

    let next = values.reduce((max, [value]) => {
      const n = Number(value);

      return Number.isSafeInteger(n) && n > 0 ? Math.max(max, n + 1) : max;
    }, 1);

    values.forEach(([value], index) => {
      if (/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(String(value))) {
        sheet.getRange(index + 2, 1).setValue(next++);
      }
    });
  }
}

// ==========================================
// CHATBOT LEADS SETUP
// ==========================================

function setupChatbotLeads() {
  const ss = SpreadsheetApp.openById(CHATBOT_SPREADSHEET_ID);

  let sheet = ss.getSheetByName(CHATBOT_TAB_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(CHATBOT_TAB_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet
      .getRange(1, 1, 1, CHATBOT_HEADERS.length)
      .setValues([CHATBOT_HEADERS]);

    sheet.setFrozenRows(1);
  } else {
    const current = sheet
      .getRange(1, 1, 1, CHATBOT_HEADERS.length)
      .getValues()[0];

    if (CHATBOT_HEADERS.some((header, i) => current[i] !== header)) {
      throw new Error("Chatbot Leads headers do not match.");
    }
  }

  return sheet;
}

// ==========================================
// CHATBOT FIELD HELPERS
// ==========================================

function getLeadField_(details, ...keys) {
  for (const key of keys) {
    const value = details[key];

    if (value !== undefined && value !== null && String(value).trim()) {
      return safeText_(value);
    }
  }

  return "";
}

// ==========================================
// CHATBOT LEAD SAVING
// ==========================================

function saveChatbotLead_(body) {
  const data = body.data || {};

  if (!data.lead_id) {
    throw new Error("Missing lead ID.");
  }

  if (!data.session_id) {
    throw new Error("Missing session ID.");
  }

  const details =
    data.details &&
    typeof data.details === "object" &&
    !Array.isArray(data.details)
      ? data.details
      : {};

  const leadId = String(data.lead_id);

  if (leadId.length > 200) {
    throw new Error("Invalid lead ID.");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const sheet = setupChatbotLeads();

    const lastRow = sheet.getLastRow();

    // Prevent duplicate lead IDs in the Sheet.
    if (lastRow > 1) {
      const existingIds = sheet
        .getRange(2, 2, lastRow - 1, 1)
        .getValues()
        .flat();

      if (existingIds.some((id) => String(id) === leadId)) {
        return {
          ok: true,
          saved: true,
          duplicate: true,
          message: "Lead already exists.",
        };
      }
    }

    const name = getLeadField_(
      details,
      "full_name",
      "name",
      "contact_name",
      "customer_name",
    );

    const phone = getLeadField_(
      details,
      "mobile_number",
      "phone",
      "mobile",
      "phone_number",
      "contact_number",
    );

    const email = getLeadField_(details, "email", "email_address");

    const location = getLeadField_(
      details,
      "location",
      "city",
      "preferred_location",
      "property_location",
    );

    const requirement = getLeadField_(
      details,
      "requirement",
      "requirements",
      "message",
      "project_details",
      "service_requirement",
    );

    const extraDetails = safeText_(JSON.stringify(details), 20000);

    const conversation = safeText_(data.conversation || "", 45000);

    sheet.appendRow([
      new Date(),
      safeText_(leadId),
      safeText_(data.session_id),
      safeText_(data.service),
      name,
      phone,
      email,
      location,
      requirement,
      extraDetails,
      conversation,
      "Website Chatbot",
    ]);

    SpreadsheetApp.flush();

    return {
      ok: true,
      saved: true,
      duplicate: false,
      message: "Chatbot lead saved.",
      lead_id: leadId,
    };
  } finally {
    lock.releaseLock();
  }
}

// ==========================================
// EXISTING CONTACT FORM SAVING
// ==========================================

function saveContactEnquiry_(body) {
  const expectedSecret = PropertiesService.getScriptProperties().getProperty(
    "CONTACT_FORM_SECRET",
  );

  if (!expectedSecret || body.secret !== expectedSecret) {
    throw new Error("Unauthorized request.");
  }

  const id = String(body.id || "");

  const payload = body.data || {};

  if (!SERVICES.includes(payload.service)) {
    throw new Error("Select a service.");
  }

  const mobile = String(payload.mobile_number || "").trim();

  if (!/^\+?[0-9]{10,15}$/.test(mobile)) {
    throw new Error("Please enter a valid mobile number.");
  }

  const email = String(payload.email || "").trim();

  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error("Please enter a valid email address.");
  }

  const lock = LockService.getScriptLock();

  lock.waitLock(15000);

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    const sheet = ss.getSheetByName(TAB_NAME);

    checkHeaders_(sheet);

    if (
      CacheService.getScriptCache().get("status_" + id) === '{"saved":true}'
    ) {
      return {
        ok: true,
        message: "Enquiry already received.",
      };
    }

    const lastRow = sheet.getLastRow();

    let nextId = 1;

    if (lastRow > 1) {
      const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();

      for (const [value] of values) {
        const number = Number(value);

        if (Number.isSafeInteger(number) && number > 0) {
          nextId = Math.max(nextId, number + 1);
        }
      }
    }

    const clean = (key) => safeText_(payload[key]);

    sheet.appendRow([
      nextId,
      clean("full_name"),
      mobile,
      clean("email"),
      clean("service"),

      payload.service === "Real Estate" ? clean("property_type") : "",

      combined_(
        payload.service === "Real Estate" ? clean("requirement") : "",
        clean("message"),
      ),

      new Date(),
    ]);

    CacheService.getScriptCache().put("status_" + id, '{"saved":true}', 600);

    return {
      ok: true,
      message: "Enquiry received.",
      id: nextId,
    };
  } finally {
    lock.releaseLock();
  }
}

// ==========================================
// EXISTING GET REQUEST
// ==========================================

function doGet(e) {
  const id = String((e && e.parameter.id) || "");

  const callback = String((e && e.parameter.callback) || "");

  if (
    !/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(id) ||
    !/^sawaiConfirm_[a-zA-Z0-9_]{1,64}$/.test(callback)
  ) {
    return ContentService.createTextOutput("OK").setMimeType(
      ContentService.MimeType.TEXT,
    );
  }

  const result =
    CacheService.getScriptCache().get("status_" + id) || '{"saved":false}';

  return ContentService.createTextOutput(
    callback + "(" + result + ");",
  ).setMimeType(ContentService.MimeType.JAVASCRIPT);
}

// ==========================================
// MAIN POST REQUEST
// ==========================================

function doPost(e) {
  let id = "";

  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Empty request.");
    }

    const body = JSON.parse(e.postData.contents);

    id = String(body.id || "");

    if (!/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(id)) {
      throw new Error("Invalid request ID.");
    }

    // Temporary, unauthenticated chatbot route.
    // For initial testing only.
    if (body.type === "chatbot_lead") {
      return reply_(saveChatbotLead_(body));
    }

    // Existing authenticated contact form.
    if (body.type === "contact") {
      return reply_(saveContactEnquiry_(body));
    }

    throw new Error("Invalid form type.");
  } catch (error) {
    console.error(error);

    if (/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(id)) {
      CacheService.getScriptCache().put(
        "status_" + id,
        JSON.stringify({
          saved: false,
          error: "Submission failed.",
        }),
        600,
      );
    }

    return reply_({
      ok: false,
      message: String(error.message || "Submission failed."),
    });
  }
}
