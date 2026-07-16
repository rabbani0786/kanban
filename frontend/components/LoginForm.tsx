"use client";

import { FormEvent, useState } from "react";
import { login, register } from "@/lib/auth";

type LoginFormProps = {
  onSuccess: () => void;
};

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (mode === "register") {
        await register(username, password);
      } else {
        await login(username, password);
      }
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(
        message || (mode === "register" ? "Could not create an account." : "Could not sign in.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-shell">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1 className="login-title">
          Project <span className="app-header-accent">Board</span>
        </h1>
        <p className="login-subtitle">
          {mode === "login" ? "Sign in to continue" : "Create an account to get started"}
        </p>

        <label className="login-field">
          Username
          <input
            className="login-input"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            aria-label="Username"
            autoFocus
          />
        </label>

        <label className="login-field">
          Password
          <input
            className="login-input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-label="Password"
          />
        </label>

        {error ? (
          <p role="alert" className="login-error">
            {error}
          </p>
        ) : null}

        <button type="submit" className="login-submit" disabled={isSubmitting}>
          {isSubmitting
            ? "Please wait…"
            : mode === "login"
              ? "Sign in"
              : "Create account"}
        </button>

        <button
          type="button"
          className="login-mode-toggle"
          onClick={() => {
            setError("");
            setMode((current) => (current === "login" ? "register" : "login"));
          }}
        >
          {mode === "login"
            ? "Need an account? Register"
            : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
