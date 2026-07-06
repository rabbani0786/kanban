import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/components/LoginForm";

describe("LoginForm", () => {
  it("calls onSuccess for the correct credentials", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    render(<LoginForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText("Username"), "user");
    await user.type(screen.getByLabelText("Password"), "password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("shows an error and does not call onSuccess for wrong credentials", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    render(<LoginForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText("Username"), "user");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Invalid username or password.");
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("clears a previous error once credentials are corrected", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    render(<LoginForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText("Username"), "user");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByRole("alert")).toBeInTheDocument();

    const passwordInput = screen.getByLabelText("Password");
    await user.clear(passwordInput);
    await user.type(passwordInput, "password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});
