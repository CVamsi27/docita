import { act, cleanup, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TurnstileWidget } from "./turnstile-widget";

type WidgetOptions = Parameters<NonNullable<Window["turnstile"]>["render"]>[1];

afterEach(() => {
  cleanup();
  delete window.turnstile;
  document
    .querySelectorAll('script[src*="challenges.cloudflare.com"]')
    .forEach((script) => script.remove());
});

function provider() {
  let options: WidgetOptions | undefined;
  const renderWidget = vi.fn(
    (_container: HTMLElement | string, input: WidgetOptions) => {
      options = input;
      return "synthetic-widget";
    },
  );
  const remove = vi.fn();
  window.turnstile = { render: renderWidget, remove };
  return {
    renderWidget,
    remove,
    callbacks: () => {
      if (!options) throw new Error("Widget has not rendered");
      return options;
    },
  };
}

describe("TurnstileWidget lifecycle", () => {
  it("retains the verified widget when its token rerenders the parent", () => {
    const mock = provider();
    function SignIn() {
      const [token, setToken] = useState<string | null>(null);
      return (
        <>
          <TurnstileWidget
            siteKey="synthetic-site-key"
            onToken={setToken}
            onExpire={() => setToken(null)}
          />
          <output>{token ? "Verified" : "Waiting"}</output>
        </>
      );
    }
    const view = render(<SignIn />);
    act(() => mock.callbacks().callback("synthetic-token"));
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(mock.renderWidget).toHaveBeenCalledTimes(1);
    expect(mock.remove).not.toHaveBeenCalled();
    act(() => mock.callbacks()["expired-callback"]?.());
    expect(screen.getByText("Waiting")).toBeInTheDocument();
    expect(mock.renderWidget).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(mock.remove).toHaveBeenCalledTimes(1);
  });

  it("delivers provider callbacks to the latest committed handlers without remounting", () => {
    const mock = provider();
    const firstToken = vi.fn();
    const firstExpire = vi.fn();
    const secondToken = vi.fn();
    const secondExpire = vi.fn();
    const { rerender } = render(
      <TurnstileWidget
        siteKey="site-one"
        onToken={firstToken}
        onExpire={firstExpire}
      />,
    );
    const originalCallbacks = mock.callbacks();
    rerender(
      <TurnstileWidget
        siteKey="site-one"
        onToken={secondToken}
        onExpire={secondExpire}
      />,
    );
    act(() => {
      originalCallbacks.callback("synthetic-token");
      originalCallbacks["expired-callback"]?.();
    });
    expect(secondToken).toHaveBeenCalledWith("synthetic-token");
    expect(secondExpire).toHaveBeenCalledOnce();
    expect(firstToken).not.toHaveBeenCalled();
    expect(firstExpire).not.toHaveBeenCalled();
    expect(mock.renderWidget).toHaveBeenCalledTimes(1);
    rerender(
      <TurnstileWidget
        siteKey="site-two"
        onToken={secondToken}
        onExpire={secondExpire}
      />,
    );
    expect(mock.renderWidget).toHaveBeenCalledTimes(2);
    expect(mock.remove).toHaveBeenCalledTimes(1);
  });

  it("waits for the provider script and cleans up a pending load on unmount", () => {
    const onToken = vi.fn();
    const onExpire = vi.fn();
    const first = render(
      <TurnstileWidget
        siteKey="site-one"
        onToken={onToken}
        onExpire={onExpire}
      />,
    );
    const script = document.querySelector(
      'script[src*="challenges.cloudflare.com"]',
    );
    expect(script).toBeInstanceOf(HTMLScriptElement);
    first.unmount();
    const mock = provider();
    act(() => script?.dispatchEvent(new Event("load")));
    expect(mock.renderWidget).not.toHaveBeenCalled();
    delete window.turnstile;
    const second = render(
      <TurnstileWidget
        siteKey="site-one"
        onToken={onToken}
        onExpire={onExpire}
      />,
    );
    window.turnstile = { render: mock.renderWidget, remove: mock.remove };
    act(() => script?.dispatchEvent(new Event("load")));
    expect(mock.renderWidget).toHaveBeenCalledTimes(1);
    second.unmount();
    expect(mock.remove).toHaveBeenCalledTimes(1);
  });

  it("renders no widget when no site key is configured", () => {
    const mock = provider();
    const view = render(
      <TurnstileWidget
        siteKey={undefined}
        onToken={vi.fn()}
        onExpire={vi.fn()}
      />,
    );
    expect(view.container).toBeEmptyDOMElement();
    expect(mock.renderWidget).not.toHaveBeenCalled();
  });
});
