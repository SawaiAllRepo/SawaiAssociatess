
import { useCallback, useEffect, useRef, useState } from "react";

import {
  clearSession,
  getSessionId,
  MAX_MESSAGE_LENGTH,
  postChat,
  mirrorConfirmedLead,
  storage,
  trackEvent,
} from "./chatService";

import { CHATBOT_DEMO_MODE } from "./apiConfig";
import Markdown from "./Markdown";
import logoMark from "./assets/logo-mark.png";
import "./chatbot.css";

// Backend handles the conversation and lead creation.
// Google Sheets receives only backend-confirmed leads.

const CHIP_MESSAGES = {
  "real estate": "I need help with Real Estate",
  insurance: "I need help with Insurance",
  "it services": "I need help with IT Services",
};

const TRANSCRIPT_KEY = "sawai_chat_transcript";
const MAX_STORED_MESSAGES = 60;

const createMessage = (role, text, extra = {}) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  role,
  text,
  error: false,
  time: new Date(),
  ...extra,
});

const formatTime = (date) =>
  date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const wait = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const typingDelay = (text) =>
  Math.min(500 + text.length * 16, 1500);

// -----------------------------------------------
// CONVERSATION STORAGE
// -----------------------------------------------

function loadTranscript() {
  if (!getSessionId()) return null;

  try {
    const saved = JSON.parse(
      storage.get(TRANSCRIPT_KEY) || "[]"
    );

    if (!Array.isArray(saved) || saved.length === 0) {
      return null;
    }

    return saved
      .filter(
        (message) =>
          message &&
          (
            message.role === "user" ||
            message.role === "bot" ||
            message.role === "summary"
          )
      )
      .map((message) => ({
        ...message,
        time: new Date(message.time),
      }));
  } catch {
    return null;
  }
}

// -----------------------------------------------
// ICONS
// -----------------------------------------------

const ChatIcon = () => (
  <svg
    width="26"
    height="26"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.6-5A8.5 8.5 0 1 1 21 11.5z" />
    <path
      d="M12.5 7.5l1.1 2.9 2.9 1.1-2.9 1.1-1.1 2.9-1.1-2.9-2.9-1.1 2.9-1.1z"
      fill="currentColor"
      stroke="none"
    />
  </svg>
);

const CloseIcon = ({ size = 22 }) => (
  <span
    className="sc-icon-glyph sc-close-glyph"
    style={{ width: size, height: size }}
    aria-hidden="true"
  >
    ×
  </span>
);

const ResetIcon = () => (
  <span
    className="sc-icon-glyph sc-reset-glyph"
    aria-hidden="true"
  >
    ↻
  </span>
);

const SendIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3.7 3.3L21 12 3.7 20.7 6 12z" />
    <path d="M6 12h15" />
  </svg>
);

// -----------------------------------------------
// BOT AVATAR
// -----------------------------------------------

const BotAvatar = ({ size = 34 }) => (
  <span
    className="sc-avatar"
    style={{
      width: size,
      height: size,
    }}
  >
    <img
      src={logoMark}
      alt="Sawai Associates"
      width={size}
      height={size}
      draggable="false"
    />
  </span>
);

// -----------------------------------------------
// FLOATING CHAT BUTTON
// -----------------------------------------------

const ChatLauncher = ({ open, onToggle }) => (
  <button
    type="button"
    className={`sc-launcher ${open ? "is-open" : ""}`}
    onClick={onToggle}
    aria-label={open ? "Close chat" : "Open chat"}
    data-testid="chatbot-launcher-button"
  >
    <span className="sc-launcher-icon sc-icon-chat">
      <ChatIcon />
    </span>

    <span className="sc-launcher-icon sc-icon-close">
      <CloseIcon size={24} />
    </span>

    {!open && <span className="sc-launcher-dot" />}

    <span className="sc-launcher-tip">
      Ask Sawai AI
    </span>
  </button>
);

// -----------------------------------------------
// CHAT HEADER
// -----------------------------------------------

const ChatHeader = ({
  onClose,
  onReset,
  progress,
}) => (
  <div className="sc-header">
    <BotAvatar size={46} />

    <div className="sc-header-text">
      <h3
        className="sc-title"
        data-testid="chatbot-title"
      >
        Sawai AI Assistant
      </h3>

      <p className="sc-status">
        <span className="sc-status-dot" />

        {CHATBOT_DEMO_MODE ? (
          "DEMO · Simulated"
        ) : progress ? (
          <>
            Online ·{" "}
            <span data-testid="chatbot-progress">
              {progress}
            </span>
          </>
        ) : (
          "Online · Here to help"
        )}
      </p>
    </div>

    <button
      type="button"
      className="sc-icon-btn"
      onClick={onReset}
      title="Restart chat"
      data-testid="chatbot-reset-button"
    >
      <ResetIcon />
    </button>

    <button
      type="button"
      className="sc-icon-btn"
      onClick={onClose}
      title="Close"
      data-testid="chatbot-close-button"
    >
      <CloseIcon size={19} />
    </button>
  </div>
);

// -----------------------------------------------
// MESSAGE BUBBLE
// -----------------------------------------------

const MessageBubble = ({ message }) => {
  const isUser = message.role === "user";

  return (
    <div
      className={`sc-row ${
        isUser ? "sc-row-user" : "sc-row-bot"
      }`}
      data-testid={`chatbot-message-${message.role}`}
    >
      {!isUser && <BotAvatar size={28} />}

      <div className="sc-bubble-wrap">
        <div
          className={`sc-bubble ${
            isUser
              ? "sc-bubble-user"
              : "sc-bubble-bot"
          } ${
            message.error
              ? "sc-bubble-error"
              : ""
          }`}
        >
          {isUser || message.error ? (
            message.text
          ) : (
            <Markdown text={message.text} />
          )}
        </div>

        <span className="sc-time">
          {formatTime(message.time)}
        </span>
      </div>
    </div>
  );
};

// -----------------------------------------------
// LEAD SUMMARY CARD
// -----------------------------------------------

const SummaryCard = ({ message }) => (
  <div
    className="sc-row sc-row-bot"
    data-testid="chatbot-summary"
  >
    <BotAvatar size={28} />

    <div className="sc-summary">
      <div className="sc-summary-title">
        Your details
      </div>

      {message.items.map((item) => (
        <div
          className="sc-summary-row"
          key={item.label}
        >
          <span className="sc-summary-label">
            {item.label}
          </span>

          <span className="sc-summary-value">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  </div>
);

// -----------------------------------------------
// TYPING INDICATOR
// -----------------------------------------------

const TypingIndicator = () => (
  <div className="sc-row sc-row-bot">
    <BotAvatar size={28} />

    <div className="sc-bubble sc-bubble-bot sc-typing">
      <span />
      <span />
      <span />
    </div>
  </div>
);

// -----------------------------------------------
// CHAT MESSAGES
// -----------------------------------------------

const ChatMessages = ({
  messages,
  loading,
  children,
}) => {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, loading, children]);

  return (
    <div
      className="sc-messages"
      data-testid="chatbot-messages"
      role="log"
      aria-live="polite"
    >
      {messages.map((message) =>
        message.role === "summary" ? (
          <SummaryCard
            key={message.id}
            message={message}
          />
        ) : (
          <MessageBubble
            key={message.id}
            message={message}
          />
        )
      )}

      {loading && <TypingIndicator />}

      {children}

      <div ref={endRef} />
    </div>
  );
};

// -----------------------------------------------
// CHAT OPTIONS
// -----------------------------------------------

const Chips = ({
  options,
  onSelect,
  className = "",
}) => (
  <div
    className={`sc-chips ${className}`.trim()}
  >
    {options.map((option) => (
      <button
        key={`${option.action || "msg"}-${
          option.target || ""
        }-${option.label}`}
        type="button"
        className="sc-chip"
        onClick={(event) =>
          onSelect(option, event)
        }
        data-testid={`chatbot-chip-${option.label
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")}`}
      >
        {option.label}
      </button>
    ))}
  </div>
);

// -----------------------------------------------
// CHAT INPUT
// -----------------------------------------------

const ChatInput = ({
  open,
  disabled,
  placeholder,
  inputMode,
  onSend,
}) => {
  const [value, setValue] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 320);

    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (open && !disabled) {
      inputRef.current?.focus();
    }
  }, [disabled, open]);

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!value.trim() || disabled) {
      return;
    }

    onSend(value, event);
    setValue("");
  };

  return (
    <form
      className="sc-input-bar"
      onSubmit={handleSubmit}
    >
      <input
        ref={inputRef}
        type="text"
        className="sc-input"
        placeholder={placeholder}
        inputMode={inputMode}
        value={value}
        onChange={(event) =>
          setValue(event.target.value)
        }
        maxLength={MAX_MESSAGE_LENGTH}
        aria-label="Type your message"
        data-testid="chatbot-input"
      />

      <button
        type="submit"
        className="sc-send"
        disabled={!value.trim() || disabled}
        aria-label="Send message"
        data-testid="chatbot-send-button"
      >
        <SendIcon />
      </button>
    </form>
  );
};

// -----------------------------------------------
// INPUT FIELD HINTS
// -----------------------------------------------

const inputHintFor = (field) => {
  if (field === "contact.mobile") {
    return {
      placeholder: "Your mobile number",
      inputMode: "tel",
    };
  }

  if (field === "contact.email") {
    return {
      placeholder: "Your email address",
      inputMode: "email",
    };
  }

  if (field === "contact.name") {
    return {
      placeholder: "Your name",
      inputMode: undefined,
    };
  }

  return {
    placeholder: "Ask me anything…",
    inputMode: undefined,
  };
};

// -----------------------------------------------
// GOOGLE SHEETS TRANSCRIPT PREPARATION
// -----------------------------------------------

function prepareLeadTranscript(messages, userText, reply) {
  const transcript = messages
    .filter(
      (message) =>
        !message.error &&
        (
          message.role === "user" ||
          message.role === "bot"
        )
    )
    .map((message) => ({
      role: message.role,
      text: String(message.text || ""),
    }));

  if (userText) {
    transcript.push({
      role: "user",
      text: userText,
    });
  }

  if (reply) {
    transcript.push({
      role: "bot",
      text: String(reply),
    });
  }

  return transcript;
}

// -----------------------------------------------
// MAIN CHATBOT COMPONENT
// -----------------------------------------------

export default function Chatbot({
  bottomOffset = 96,
}) {
  const [open, setOpen] = useState(false);

  const [messages, setMessages] = useState(() =>
    CHATBOT_DEMO_MODE
      ? []
      : loadTranscript() || []
  );

  const [loading, setLoading] = useState(false);
  const [chips, setChips] = useState([]);
  const [progress, setProgress] = useState(null);

  const [inputHint, setInputHint] = useState(() =>
    inputHintFor(null)
  );

  const busyRef = useRef(false);
  const runRef = useRef(0);
  const handledEventsRef = useRef(new WeakSet());

  // Latest conversation used for lead transcript.
  const messagesRef = useRef(messages);

  const appendMessage = (message) => {
    messagesRef.current = [
      ...messagesRef.current,
      message,
    ];

    setMessages(messagesRef.current);
  };

  const isDuplicateEvent = (event) => {
    const nativeEvent =
      event?.nativeEvent || event;

    if (
      !nativeEvent ||
      (
        typeof nativeEvent !== "object" &&
        typeof nativeEvent !== "function"
      )
    ) {
      return false;
    }

    if (
      handledEventsRef.current.has(nativeEvent)
    ) {
      return true;
    }

    handledEventsRef.current.add(nativeEvent);
    return false;
  };

  // -------------------------------------------
  // BOT REPLY
  // -------------------------------------------

  const say = useCallback(
    async (
      text,
      run,
      delay = typingDelay(text)
    ) => {
      setLoading(true);

      await wait(delay);

      if (run !== runRef.current) {
        return false;
      }

      appendMessage(
        createMessage("bot", text)
      );

      setLoading(false);

      return true;
    },
    []
  );

  // -------------------------------------------
  // LIFECYCLE
  // -------------------------------------------

  useEffect(() => {
    runRef.current++;

    return () => {
      runRef.current++;
    };
  }, []);

  useEffect(() => {
    if (CHATBOT_DEMO_MODE) {
      return;
    }

    const keep = messages
      .filter((message) => !message.error)
      .slice(-MAX_STORED_MESSAGES);

    if (
      keep.length > 0 &&
      getSessionId()
    ) {
      storage.set(
        TRANSCRIPT_KEY,
        JSON.stringify(keep)
      );
    }
  }, [messages]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener(
      "keydown",
      onKey
    );

    return () => {
      window.removeEventListener(
        "keydown",
        onKey
      );
    };
  }, []);

  const pushUser = (text) => {
    appendMessage(
      createMessage("user", text)
    );
  };

  // -------------------------------------------
  // HANDLE BACKEND RESPONSE
  // -------------------------------------------

  const showResponse = async (
    data,
    run
  ) => {
    const reply = data.reply.trim();

    if (
      !(await say(reply, run, 0))
    ) {
      return;
    }

    if (
      Array.isArray(data?.summary) &&
      data.summary.length > 0
    ) {
      const items = data.summary.filter(
        (item) =>
          typeof item?.label === "string" &&
          typeof item?.value === "string"
      );

      if (items.length) {
        appendMessage(
          createMessage(
            "summary",
            "",
            { items }
          )
        );
      }
    }

    setProgress(
      typeof data?.progress === "string" &&
      data.progress.trim()
        ? data.progress
        : null
    );

    setInputHint(
      inputHintFor(data?.next_field)
    );

    const menu = (
      Array.isArray(data?.menu_options)
        ? data.menu_options
        : []
    )
      .filter(
        (label) =>
          typeof label === "string" &&
          label.trim()
      )
      .map((label) => ({
        label,
      }));

    const actions = (
      Array.isArray(data?.actions)
        ? data.actions
        : []
    ).filter(
      (action) =>
        typeof action?.label === "string" &&
        typeof action?.action === "string"
    );

    setChips([
      ...menu,
      ...actions,
    ]);
  };

  // -------------------------------------------
  // SEND MESSAGE
  // -------------------------------------------

  const send = async (
    payload,
    userText
  ) => {
    if (busyRef.current) {
      return;
    }

    busyRef.current = true;

    const run = runRef.current;

    if (userText) {
      pushUser(userText);
    }

    setChips([]);
    setLoading(true);

    try {
      // Existing backend call
      const data = await postChat(payload);

      if (
        run !== runRef.current
      ) {
        return;
      }

      // ---------------------------------------
      // GOOGLE SHEETS LEAD SAVING
      // ---------------------------------------
      // Only submit when the backend confirms
      // a customer lead was created.
      // This does not send ordinary messages.

      if (
        !CHATBOT_DEMO_MODE &&
        data.lead_created === true &&
        data.lead_id &&
        data.session_id
      ) {
        const transcript =
          prepareLeadTranscript(
            messagesRef.current,
            null,
            data.reply
          );

        // Do not interrupt the chatbot if the
        // Google Sheets submission fails.
        void mirrorConfirmedLead(
          data,
          transcript
        ).catch((error) => {
          console.error(
            "Google Sheets lead submission error:",
            error
          );
        });
      }

      // Existing chatbot reply
      setLoading(false);

      await showResponse(
        data,
        run
      );
    } catch (error) {
      if (
        run !== runRef.current
      ) {
        return;
      }

      setLoading(false);

      appendMessage(
        createMessage(
          "bot",
          error.message ||
            "Sorry, something went wrong. Please try again.",
          { error: true }
        )
      );
    } finally {
      if (
        run === runRef.current
      ) {
        busyRef.current = false;
      }
    }
  };

  // -------------------------------------------
  // OPTION BUTTONS
  // -------------------------------------------

  const handleChip = (
    chip,
    event
  ) => {
    if (isDuplicateEvent(event)) {
      return;
    }

    if (busyRef.current) {
      return;
    }

    if (
      chip.label.toLowerCase() ===
      "talk to an expert"
    ) {
      trackEvent("expert_request");
    }

    if (
      chip.action === "request_call"
    ) {
      trackEvent("call_request");
    }

    if (
      chip.action === "whatsapp"
    ) {
      trackEvent(
        "whatsapp_request"
      );

      if (
        typeof chip.url === "string" &&
        chip.url.startsWith("https://")
      ) {
        window.open(
          chip.url,
          "_blank",
          "noopener"
        );
      }
    }

    if (chip.action) {
      send(
        chip.target
          ? {
              action: chip.action,
              target: chip.target,
            }
          : {
              action: chip.action,
            },
        chip.label
      );
    } else {
      send(
        {
          message:
            CHIP_MESSAGES[
              chip.label.toLowerCase()
            ] || chip.label,
        },
        chip.label
      );
    }
  };

  // -------------------------------------------
  // USER TEXT INPUT
  // -------------------------------------------

  const handleSend = (
    text,
    event
  ) => {
    if (isDuplicateEvent(event)) {
      return;
    }

    const clean = text.trim();

    if (
      !clean ||
      busyRef.current
    ) {
      return;
    }

    if (
      clean.length >
      MAX_MESSAGE_LENGTH
    ) {
      appendMessage(
        createMessage(
          "bot",
          "That's a long one! Please keep messages under 2,000 characters.",
          { error: true }
        )
      );

      return;
    }

    send(
      { message: clean },
      clean
    );
  };

  // -------------------------------------------
  // RESET CHAT
  // -------------------------------------------

  const handleReset = () => {
    runRef.current++;

    busyRef.current = false;

    if (!CHATBOT_DEMO_MODE) {
      clearSession();
    }

    storage.remove(
      TRANSCRIPT_KEY
    );

    messagesRef.current = [];

    setMessages([]);
    setChips([]);
    setProgress(null);

    setInputHint(
      inputHintFor(null)
    );

    setLoading(false);

    send({
      message: "Hi",
    });
  };

  // -------------------------------------------
  // CHAT OPEN / CLOSE
  // -------------------------------------------

  const toggle = () => {
    if (!open) {
      trackEvent(
        "chatbot_open"
      );

      if (
        messagesRef.current.length === 0 &&
        !busyRef.current
      ) {
        send({
          message: "Hi",
        });
      }
    }

    setOpen(!open);
  };

  // -------------------------------------------
  // CHATBOT UI
  // -------------------------------------------

  return (
    <div
      className="sc-root"
      style={{
        "--sc-bottom": `${bottomOffset}px`,
      }}
    >
      <section
        className={`sc-window ${
          open ? "is-open" : ""
        }`}
        role="dialog"
        aria-label="Sawai AI Assistant"
        aria-hidden={!open}
        data-testid="chatbot-window"
      >
        <ChatHeader
          onClose={() =>
            setOpen(false)
          }
          onReset={
            handleReset
          }
          progress={
            progress
          }
        />

        {CHATBOT_DEMO_MODE && (
          <div
            className="sc-demo-banner"
            role="status"
          >
            DEMO MODE · Simulated replies only.
            No backend, consent, or leads are used.
          </div>
        )}

        <ChatMessages
          messages={
            messages
          }
          loading={
            loading
          }
        >
          {!loading &&
            chips.some(
              (chip) =>
                !chip.action
            ) && (
              <Chips
                options={chips.filter(
                  (chip) =>
                    !chip.action
                )}
                onSelect={
                  handleChip
                }
              />
            )}

          {!loading &&
            chips.some(
              (chip) =>
                chip.action
            ) && (
              <Chips
                options={chips.filter(
                  (chip) =>
                    chip.action
                )}
                onSelect={
                  handleChip
                }
                className="sc-navigation"
              />
            )}
        </ChatMessages>

        <ChatInput
          open={open}
          disabled={loading}
          placeholder={
            inputHint.placeholder
          }
          inputMode={
            inputHint.inputMode
          }
          onSend={
            handleSend
          }
        />

        <p className="sc-footnote">
          Sawai AI can make mistakes.
          Verify important info.
        </p>
      </section>

      <ChatLauncher
        open={open}
        onToggle={toggle}
      />
    </div>
  );
}
