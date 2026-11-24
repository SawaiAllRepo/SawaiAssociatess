// src/hooks/useEnquiry.js
//
// Small form-submission hook shared by every enquiry form.
// Tracks one of: idle -> submitting -> (success | error), then back to idle.

import { useState, useCallback } from "react";
import { submitEnquiry } from "../utils/api";

export const FORM_STATUS = {
  IDLE: "idle",
  SUBMITTING: "submitting",
  SUCCESS: "success",
  ERROR: "error",
};

/**
 * @param {string} formType  Value sent as `form_type` in the payload.
 * @param {object} [options]
 * @param {number} [options.autoResetDelay=5000]  ms before an error resets.
 *   Success stays visible until the visitor closes the confirmation.
 */
export function useEnquiry(formType, { autoResetDelay = 5000 } = {}) {
  const [status, setStatus] = useState(FORM_STATUS.IDLE);
  const [error, setError] = useState(null);
  const reset = useCallback(() => {
    setStatus(FORM_STATUS.IDLE);
    setError(null);
  }, []);

  const submit = useCallback(
    async (fields = {}) => {
      setStatus(FORM_STATUS.SUBMITTING);
      setError(null);

      try {
        await submitEnquiry({ form_type: formType, ...fields });
        setStatus(FORM_STATUS.SUCCESS);

        return true;
      } catch (err) {
        setError(err?.message || "Something went wrong. Please try again.");
        setStatus(FORM_STATUS.ERROR);

        if (autoResetDelay > 0) {
          setTimeout(() => setStatus(FORM_STATUS.IDLE), autoResetDelay);
        }
        return false;
      }
    },
    [formType, autoResetDelay]
  );

  return { status, error, submit, reset };
}
