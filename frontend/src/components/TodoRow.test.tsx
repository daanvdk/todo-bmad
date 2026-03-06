import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TodoRow } from "./TodoRow";

describe("TodoRow", () => {
  it("renders left slot content", () => {
    render(
      <ul>
        <TodoRow left={<span>left-content</span>} content={<span>main</span>} />
      </ul>,
    );
    expect(screen.getByText("left-content")).toBeInTheDocument();
  });

  it("renders content slot", () => {
    render(
      <ul>
        <TodoRow left={<span>l</span>} content={<span>center-content</span>} />
      </ul>,
    );
    expect(screen.getByText("center-content")).toBeInTheDocument();
  });

  it("renders right slot when provided", () => {
    render(
      <ul>
        <TodoRow
          left={<span>l</span>}
          content={<span>c</span>}
          right={<span>right-content</span>}
        />
      </ul>,
    );
    expect(screen.getByText("right-content")).toBeInTheDocument();
  });
});
