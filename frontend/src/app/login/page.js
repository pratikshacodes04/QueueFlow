"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, AlertCircle, CheckCircle2, Info, ArrowRight } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import FormField from "@/components/auth/FormField";
import PasswordField from "@/components/auth/PasswordField";
import { useAuth } from "@/context/AuthContext";
import { validateEmail } from "@/utils/validators";

function describeLoginError(err) {
  if (err?.status === 401) return "Incorrect email or password. Please try again.";
  if (err?.status === 403) return err.message || "This account has been deactivated.";
  if (err?.status === 408 || err?.name === "TypeError") {
    return "Cannot reach the QueueFlow server. Check your connection and try again.";
  }
  if (err?.status === 422) return "Please check your email and password and try again.";
  return err?.message || "Sign in failed. Please try again.";
}

export default function LoginPage() {
  const router = useRouter();
  const { login, notice, consumeNotice } = useAuth();

  // Capture the one-shot notice (e.g. "Account created") then clear it from context.
  const [flash] = useState(notice);
  useEffect(() => {
    if (notice) consumeNotice();
  }, [notice, consumeNotice]);

  const [email, setEmail] = useState(flash?.email || "");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = {
      email: validateEmail(email),
      password: password ? "" : "Password is required.",
    };
    setErrors(nextErrors);
    setFormError("");

    if (nextErrors.email) return emailRef.current?.focus();
    if (nextErrors.password) return passwordRef.current?.focus();

    setSubmitting(true);
    try {
      await login({ email, password });
      router.replace("/dashboard"); // stay in "submitting" while navigating
    } catch (err) {
      setFormError(describeLoginError(err));
      setPassword("");
      setSubmitting(false);
      passwordRef.current?.focus();
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to manage your queues and tokens."
      footer={
        <>
          New to QueueFlow?{" "}
          <Link href="/register" className="auth-link">
            Create a manager account
          </Link>
        </>
      }
    >
      {flash && !formError && (
        <div className={`auth-banner auth-banner-${flash.type === "success" ? "success" : "info"}`} role="status">
          {flash.type === "success" ? <CheckCircle2 size={16} /> : <Info size={16} />}
          <span>{flash.text}</span>
        </div>
      )}

      {formError && (
        <div className="auth-banner auth-banner-error" role="alert">
          <AlertCircle size={16} />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="auth-form">
        <FormField
          ref={emailRef}
          id="login-email"
          label="Email address"
          type="email"
          icon={Mail}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors((p) => ({ ...p, email: "" }));
          }}
          onBlur={() => email && setErrors((p) => ({ ...p, email: validateEmail(email) }))}
          error={errors.email}
          placeholder="you@company.com"
          autoComplete="email"
          autoFocus={!flash?.email}
          disabled={submitting}
        />

        <PasswordField
          ref={passwordRef}
          id="login-password"
          label="Password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors((p) => ({ ...p, password: "" }));
          }}
          error={errors.password}
          placeholder="Enter your password"
          autoComplete="current-password"
          autoFocus={Boolean(flash?.email)}
          disabled={submitting}
        />

        <button type="submit" className="auth-submit" disabled={submitting}>
          {submitting ? (
            <>
              <span className="auth-spinner" aria-hidden="true" />
              <span>Signing in…</span>
            </>
          ) : (
            <>
              <span>Sign in</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
