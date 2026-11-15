import React from "react";
import { AlertCircle } from "lucide-react";

/**
 * Labelled input with leading icon, optional trailing slot, hint and error.
 * The error is announced to assistive tech via aria-describedby / role="alert".
 */
const FormField = React.forwardRef(function FormField(
  {
    id,
    label,
    optional = false,
    icon: Icon,
    error,
    hint,
    trailing,
    className = "",
    ...inputProps
  },
  ref
) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={`auth-field ${className}`}>
      <label htmlFor={id} className="auth-label">
        <span>{label}</span>
        {optional && <span className="auth-optional">Optional</span>}
      </label>

      <div className={`auth-input-wrap ${error ? "has-error" : ""}`}>
        {Icon && <Icon size={17} className="auth-input-icon" aria-hidden="true" />}
        <input
          ref={ref}
          id={id}
          className={`auth-input ${trailing ? "has-trailing" : ""} ${Icon ? "has-icon" : ""}`}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={describedBy}
          {...inputProps}
        />
        {trailing && <div className="auth-input-trailing">{trailing}</div>}
      </div>

      {error ? (
        <p id={`${id}-error`} className="auth-field-error" role="alert">
          <AlertCircle size={13} aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="auth-field-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export default FormField;
