import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("Test render error");
  return <div>Safe content</div>;
}

describe("ErrorBoundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders children when no error is thrown", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Safe content")).toBeInTheDocument();
  });

  it("renders fallback UI when a child throws", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    spy.mockRestore();
  });

  it("renders custom fallback when provided and child throws", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary fallback={<div>Custom error UI</div>}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Custom error UI")).toBeInTheDocument();
    spy.mockRestore();
  });
});
