import { act } from "react";
import { MemoryRouter } from "react-router";
import { HelmetProvider } from "react-helmet-async";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import { AuthContext } from "@/lib/auth/auth-context-inner";
import { LoginPage } from "./login-page";

const { post, showError } = vi.hoisted(() => ({
  post: vi.fn(),
  showError: vi.fn(),
}));
vi.mock("@/lib/api/api-client", () => ({ client: { post } }));
vi.mock("@/lib/errors/user-facing-errors", () => ({
  showUserFacingErrorToast: showError,
}));

type Challenge = Parameters<NonNullable<Window["turnstile"]>["render"]>[1];
let challenge: Challenge | undefined;
const renderChallenge = vi.fn<NonNullable<Window["turnstile"]>["render"]>(
  (container, options) => {
    challenge = options;
    if (container instanceof HTMLElement) {
      container.textContent = "Security verification";
    }
    return "test-widget";
  },
);
const removeChallenge = vi.fn();
const session = {
  access_token: "synthetic-access-token",
  user: {
    id: "internal-test-user",
    email: "operator@example.test",
    name: "Test operator",
    role: "INTERNAL",
    clinicId: null,
    emailVerified: true,
    onboardingStep: "COMPLETED",
  },
};

function renderLogin() {
  const login = vi.fn();
  render(
    <AuthContext.Provider
      value={{
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
        isInternal: false,
        login,
        logout: vi.fn(),
        validateToken: async () => false,
      }}
    >
      <HelmetProvider>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </HelmetProvider>
    </AuthContext.Provider>,
  );
  fireEvent.change(screen.getByPlaceholderText("Email", { exact: true }), {
    target: { value: session.user.email },
  });
  fireEvent.change(screen.getByPlaceholderText("Password", { exact: true }), {
    target: { value: "synthetic-password" },
  });
  return { login };
}

async function completeChallenge(token: string) {
  await waitFor(() => expect(renderChallenge).toHaveBeenCalled());
  if (!challenge) throw new Error("The login did not render its challenge");
  act(() => challenge?.callback(token));
}

describe("internal login security verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "synthetic-staging-site-key");
    challenge = undefined;
    window.turnstile = { render: renderChallenge, remove: removeChallenge };
    post.mockResolvedValue(session);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete window.turnstile;
  });

  it("requires a challenge before sending credentials when configured", async () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: "Login", exact: true }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "complete the security verification",
    );
    expect(post).not.toHaveBeenCalled();
  });

  it("sends the completed challenge in the canonical login payload", async () => {
    const { login } = renderLogin();
    await completeChallenge("fresh-proof");
    fireEvent.click(screen.getByRole("button", { name: "Login", exact: true }));
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        "/auth/login",
        {
          email: session.user.email,
          password: "synthetic-password",
          turnstileToken: "fresh-proof",
        },
        { skipAuth: true },
      ),
    );
    expect(login).toHaveBeenCalledWith(session.access_token, {
      ...session.user,
      clinicId: undefined,
    });
  });

  it("rejects an expired proof before sending credentials", async () => {
    renderLogin();
    await completeChallenge("expired-proof");
    act(() => challenge?.["expired-callback"]?.());
    fireEvent.click(screen.getByRole("button", { name: "Login", exact: true }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "complete the security verification",
    );
    expect(post).not.toHaveBeenCalled();
  });

  it("requires a fresh proof after a rejected login instead of replaying it", async () => {
    post.mockRejectedValueOnce(new Error("Invalid credentials"));
    renderLogin();
    await completeChallenge("consumed-proof");
    fireEvent.click(screen.getByRole("button", { name: "Login", exact: true }));
    await waitFor(() => expect(showError).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(renderChallenge).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole("button", { name: "Login", exact: true }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "complete the security verification",
    );
    expect(post).toHaveBeenCalledTimes(1);
    await completeChallenge("retry-proof");
    fireEvent.click(screen.getByRole("button", { name: "Login", exact: true }));
    await waitFor(() => expect(post).toHaveBeenCalledTimes(2));
    expect(post.mock.calls[1]?.[1]).toMatchObject({
      turnstileToken: "retry-proof",
    });
  });

  it("preserves local development login when no widget is configured", async () => {
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "");
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: "Login", exact: true }));
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post.mock.calls[0]?.[1]).toEqual({
      email: session.user.email,
      password: "synthetic-password",
    });
    expect(renderChallenge).not.toHaveBeenCalled();
  });

  it("does not treat an MFA challenge as an authenticated session", async () => {
    post.mockResolvedValueOnce({
      mfa_required: true,
      mfa_challenge_token: "challenge",
    });
    const { login } = renderLogin();
    await completeChallenge("fresh-proof");
    fireEvent.click(screen.getByRole("button", { name: "Login", exact: true }));
    await waitFor(() => expect(showError).toHaveBeenCalledTimes(1));
    expect(login).not.toHaveBeenCalled();
  });
});
