"use client";

import React, { useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import FormField from "./FormField";

/**
 * Password input with a show/hide toggle.
 */
const PasswordField = React.forwardRef(function PasswordField(props, ref) {
  const [visible, setVisible] = useState(false);

  return (
    <FormField
      ref={ref}
      icon={Lock}
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          className="auth-toggle-btn"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          tabIndex={0}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      }
    />
  );
});

export default PasswordField;
