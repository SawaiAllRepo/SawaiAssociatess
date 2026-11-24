import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FORM_STATUS } from "../hooks/useEnquiry";

export default function FormSuccess({ status, error, onClose }) {
  const okButtonRef = useRef(null);

  useEffect(() => {
    if (status !== FORM_STATUS.SUCCESS) return;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    okButtonRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [status, onClose]);

  if (status === FORM_STATUS.SUCCESS) {
    return createPortal(
      <div className="enquiry-success-overlay" onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}>
        <div
          className="enquiry-success-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="enquiry-success-title"
          aria-describedby="enquiry-success-message"
        >
          <button type="button" className="enquiry-success-close" onClick={onClose} aria-label="Close confirmation">×</button>
          <span className="enquiry-success-check" aria-hidden="true">✓</span>
          <h2 id="enquiry-success-title">Enquiry Submitted<br />Successfully!</h2>
          <p id="enquiry-success-message">
            Thank you for your enquiry. Your details have been submitted successfully.
            Our team will contact you shortly.
          </p>
          <button type="button" className="enquiry-success-ok" onClick={onClose} ref={okButtonRef}>OK</button>
        </div>
      </div>,
      document.body
    );
  }

  if (status === FORM_STATUS.ERROR) {
    return (
      <div className="form-success form-success--error" role="alert" aria-live="assertive">
        <strong>✕ Couldn't Submit</strong>
        <span>{error || "Please try again later."}</span>
      </div>
    );
  }

  return null;
}
