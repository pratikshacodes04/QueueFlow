"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Mail, Phone, AlertCircle, ArrowRight } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import FormField from "@/components/auth/FormField";
import PasswordField from "@/components/auth/PasswordField";
import PasswordStrength from "@/components/auth/PasswordStrength";
import { useAuth } from "@/context/AuthContext";
import {
  validateName,
  validateEmail,
  validatePhone,
  validatePassword,
  validateConfirmPassword,
} from "@/utils/validators";

const FIELD_ORDER = ["name", "email", "phone", "password", "confirm_password"];

function validateAll(v) {
  return {
    name: validateName(v.name),
    email: validateEmail(v.email),
    phone: validatePhone(v.phone),
    password: validatePassword(v.password),
    confirm_password: validateConfirmPassword(v.password, v.confirm_password),
  };
}

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [values, setValues] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm_password: "",
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refs = {
    name: useRef(null),
    email: useRef(null),
    phone: useRef(null),
    password: useRef(null),
    confirm_password: useRef(null),
  };

  const setField = (key) => (e) => {
    const next = { ...values, [key]: e.target.value };
    setValues(next);
    // Live re-validation once a field has been visited (or already shows an error).
    if (touched[key] || errors[key]) {
      const all = validateAll(next);
      setErrors((prev) => ({
        ...prev,
        [key]: all[key],
        // keep "confirm" in sync when the password changes
        ...(key === "password" && touched.confirm_password
          ? { confirm_password: all.confirm_password }
          : {}),
      }));
    }
  };

  const blurField = (key) => () => {
    setTouched((p) => ({ ...p, [key]: true }));
    setErrors((p) => ({ ...p, [key]: validateAll(values)[key] }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const found = validateAll(values);
    setErrors(found);
    setTouched({ name: true, email: true, phone: true, password: true, confirm_password: true });
    setFormError("");

    const firstBad = FIELD_ORDER.find((k) => found[k]);
    if (firstBad) {
      refs[firstBad].current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await register(values);
      router.push("/login");
    } catch (err) {
      setSubmitting(false);

      if (err.status === 409) {
        setErrors((p) => ({ ...p, email: err.message || "An account with this email already exists." }));
        refs.email.current?.focus();
        return;
      }

      if (err.status === 422 && Array.isArray(err.data?.detail)) {
        const mapped = {};
        err.data.detail.forEach((d) => {
          const key = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : null;
          if (FIELD_ORDER.includes(key) && !mapped[key]) {
            mapped[key] = String(d.msg || "Invalid value").replace(/^Value error,\s*/i, "");
          }
        });
        if (Object.keys(mapped).length) {
          setErrors((p) => ({ ...p, ...mapped }));
          refs[FIELD_ORDER.find((k) => mapped[k])].current?.focus();
          return;
        }
      }

      if (err.status === 408 || err.name === "TypeError") {
        setFormError("Cannot reach the QueueFlow server. Check your connection and try again.");
      } else {
        setFormError(err.message || "Registration failed. Please try again.");
      }
    }
  };

  const emailErrorHasDuplicate = /already exists/i.test(errors.email || "");

  return (
    <AuthLayout
      title="Create your manager account"
      subtitle="Set up your workspace in under a minute."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="auth-link">
            Sign in
          </Link>
        </>
      }
    >
      {formError && (
        <div className="auth-banner auth-banner-error" role="alert">
          <AlertCircle size={16} />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="auth-form">
        <FormField
          ref={refs.name}
          id="register-name"
          label="Full name"
          icon={User}
          value={values.name}
          onChange={setField("name")}
          onBlur={blurField("name")}
          error={errors.name}
          placeholder="Alex Morgan"
          autoComplete="name"
          autoFocus
          maxLength={100}
          disabled={submitting}
        />

        <div>
          <FormField
            ref={refs.email}
            id="register-email"
            label="Email address"
            type="email"
            icon={Mail}
            value={values.email}
            onChange={setField("email")}
            onBlur={blurField("email")}
            error={errors.email}
            placeholder="you@company.com"
            autoComplete="email"
            disabled={submitting}
          />
          {emailErrorHasDuplicate && (
            <p className="auth-inline-cta">
              <Link href="/login" className="auth-link">
                Go to sign in
              </Link>
            </p>
          )}
        </div>

        <FormField
          ref={refs.phone}
          id="register-phone"
          label="Phone number"
          optional
          type="tel"
          icon={Phone}
          value={values.phone}
          onChange={setField("phone")}
          onBlur={blurField("phone")}
          error={errors.phone}
          hint="Include your country code, e.g. +91 98765 43210"
          placeholder="+91 98765 43210"
          autoComplete="tel"
          inputMode="tel"
          maxLength={32}
          disabled={submitting}
        />

        <div>
          <PasswordField
            ref={refs.password}
            id="register-password"
            label="Password"
            value={values.password}
            onChange={setField("password")}
            onBlur={blurField("password")}
            error={errors.password}
            placeholder="Create a password"
            autoComplete="new-password"
            maxLength={128}
            disabled={submitting}
          />
          <PasswordStrength password={values.password} />
        </div>

        <PasswordField
          ref={refs.confirm_password}
          id="register-confirm"
          label="Confirm password"
          value={values.confirm_password}
          onChange={setField("confirm_password")}
          onBlur={blurField("confirm_password")}
          error={errors.confirm_password}
          placeholder="Re-enter your password"
          autoComplete="new-password"
          maxLength={128}
          disabled={submitting}
        />

        <button type="submit" className="auth-submit" disabled={submitting}>
          {submitting ? (
            <>
              <span className="auth-spinner" aria-hidden="true" />
              <span>Creating account…</span>
            </>
          ) : (
            <>
              <span>Create account</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
