"use client";

import { FormEvent, useState } from "react";
import { checkCredentials } from "@/lib/auth";

type LoginFormProps = {
  onSuccess: () => void;
};

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (checkCredentials(username, password)) {
      setError("");
      onSuccess();
      return;
    }

    setError("Invalid username or password.");
  };

  return (
    <div className="login-shell">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1 className="login-title">
          Project <span className="app-header-accent">Board</span>
        </h1>
        <p className="login-subtitle">Sign in to continue</p>

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

        <button type="submit" className="login-submit">
          Sign in
        </button>
      </form>
    </div>
  );
}
