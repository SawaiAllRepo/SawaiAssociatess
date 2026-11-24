const configuredBaseUrl = import.meta.env.VITE_CHATBOT_API_BASE_URL?.trim();

export const CHATBOT_DEMO_MODE = import.meta.env.VITE_CHATBOT_DEMO_MODE === "true";

export const CHATBOT_API_BASE_URL = configuredBaseUrl
  ? configuredBaseUrl.replace(/\/+$/, "")
  : "";

export const CHATBOT_API_CONFIGURED = Boolean(CHATBOT_API_BASE_URL);
export const CHATBOT_API_URL = CHATBOT_API_CONFIGURED
  ? `${CHATBOT_API_BASE_URL}/chat`
  : "";
export const CHATBOT_ANALYTICS_URL = CHATBOT_API_CONFIGURED
  ? `${CHATBOT_API_BASE_URL}/analytics/event`
  : "";
