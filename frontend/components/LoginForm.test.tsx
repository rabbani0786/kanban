import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/components/LoginForm";
import * as auth from "@/lib/auth";

vi.mock("@/lib/auth");

afterEach(() => {
  vi.mocked(auth.login).mockReset();
  vi.mocked(auth.register).mockReset();
});

describe("LoginForm", () => {
  it("calls onSuccess after a successful sign-in", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    vi.mocked(auth.login).mockResolvedValue(undefined);

    render(<LoginForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText("Username"), "user");
    await user.type(screen.getByLabelText("Password"), "password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(auth.login).toHaveBeenCalledWith("user", "password");
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("shows the backend's error message and does not call onSuccess for wrong credentials", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    vi.mocked(auth.login).mockRejectedValue(new Error("Invalid username or password"));

    render(<LoginForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText("Username"), "user");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid username or password");
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("falls back to a generic message when the error carries no detail", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    vi.mocked(auth.login).mockRejectedValue(new Error());

    render(<LoginForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText("Username"), "user");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not sign in.");
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("clears a previous error once credentials are corrected", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    vi.mocked(auth.login)
      .mockRejectedValueOnce(new Error("Invalid username or password"))
      .mockResolvedValueOnce(undefined);

    render(<LoginForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText("Username"), "user");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    const passwordInput = screen.getByLabelText("Password");
    await user.clear(passwordInput);
    await user.type(passwordInput, "password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("switches to register mode and creates an account", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    vi.mocked(auth.register).mockResolvedValue(undefined);

    render(<LoginForm onSuccess={onSuccess} />);

    await user.click(screen.getByRole("button", { name: "Need an account? Register" }));
    expect(screen.getByRole("button", { name: "Create account" })).toBeInTheDocument();

    await user.type(screen.getByLabelText("Username"), "newuser");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(auth.register).toHaveBeenCalledWith("newuser", "password123");
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("shows the backend's error message for a duplicate username", async () => {
    const user = userEvent.setup();
    vi.mocked(auth.register).mockRejectedValue(new Error("Username is already taken"));

    render(<LoginForm onSuccess={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Need an account? Register" }));
    await user.type(screen.getByLabelText("Username"), "user");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Username is already taken");
  });

  it("shows the backend's validation message for a short password", async () => {
    const user = userEvent.setup();
    vi.mocked(auth.register).mockRejectedValue(
      new Error("Password must be at least 8 characters")
    );

    render(<LoginForm onSuccess={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Need an account? Register" }));
    await user.type(screen.getByLabelText("Username"), "newuser");
    await user.type(screen.getByLabelText("Password"), "short12");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Password must be at least 8 characters"
    );
  });

  it("switches back to login mode", async () => {
    const user = userEvent.setup();

    render(<LoginForm onSuccess={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Need an account? Register" }));
    await user.click(screen.getByRole("button", { name: "Already have an account? Sign in" }));

    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });
});
