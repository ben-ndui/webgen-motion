import { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";
import { Badge } from "./badge";
import { StatusDot } from "./status-dot";
import { SegmentedControl } from "./segmented-control";
import { Field, Input } from "./field";
import { Tabs } from "./tabs";

describe("Button", () => {
  it("renders, defaults to type=button, fires onClick", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Composer</Button>);
    const btn = screen.getByRole("button", { name: "Composer" });
    expect(btn).toHaveAttribute("type", "button");
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("applies variant + size classes", () => {
    render(
      <Button variant="ink" size="lg">
        X
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "X" });
    expect(btn.className).toContain("bg-ink");
    expect(btn.className).toContain("text-base");
  });

  it("is inert when disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Off
      </Button>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Off" }));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("Badge", () => {
  it("renders content with the accent tone", () => {
    render(<Badge tone="acc">Studio</Badge>);
    const b = screen.getByText("Studio");
    expect(b.className).toContain("text-accent");
  });
});

describe("StatusDot", () => {
  it("renders label with the matching tone", () => {
    render(<StatusDot status="ready">Prêt</StatusDot>);
    const s = screen.getByText("Prêt");
    expect(s.className).toContain("text-accent");
  });
});

describe("SegmentedControl", () => {
  const opts = [
    { value: "all", label: "Tous" },
    { value: "16:9", label: "16:9" },
    { value: "9:16", label: "9:16" },
  ] as const;

  it("marks the active option and emits on change", async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        aria-label="Format"
        options={opts as never}
        value="all"
        onValueChange={onChange}
      />,
    );
    expect(screen.getByRole("radio", { name: "Tous" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await userEvent.click(screen.getByRole("radio", { name: "16:9" }));
    expect(onChange).toHaveBeenCalledWith("16:9");
  });
});

describe("Field + Input", () => {
  it("associates the label with the input", () => {
    render(
      <Field label="Nom du tour">
        {(id) => <Input id={id} defaultValue="Pitch" />}
      </Field>,
    );
    // getByLabelText resolves the htmlFor <-> id wiring
    const input = screen.getByLabelText("Nom du tour") as HTMLInputElement;
    expect(input.value).toBe("Pitch");
  });

  it("accepts typed input", async () => {
    render(<Field label="Slug">{(id) => <Input id={id} />}</Field>);
    const input = screen.getByLabelText("Slug");
    await userEvent.type(input, "hero");
    expect(input).toHaveValue("hero");
  });
});

describe("Tabs", () => {
  const tabs = [
    { value: "script", label: "Script", number: "01", badge: 7 },
    { value: "capture", label: "Capture", number: "02" },
    { value: "compose", label: "Compose", number: "05" },
  ];

  it("marks the active tab and switches on click", async () => {
    const onChange = vi.fn();
    render(
      <Tabs tabs={tabs} value="script" onValueChange={onChange} />,
    );
    const script = screen.getByRole("tab", { name: /Script/ });
    expect(script).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("7")).toBeInTheDocument(); // badge

    await userEvent.click(screen.getByRole("tab", { name: /Compose/ }));
    expect(onChange).toHaveBeenCalledWith("compose");
  });

  it("does not loop when given inline (new-identity) tabs arrays", () => {
    function Harness() {
      const [, force] = useState(0);
      return (
        <>
          <button onClick={() => force((n) => n + 1)}>rerender</button>
          <Tabs
            value="a"
            onValueChange={() => {}}
            tabs={[
              { value: "a", label: "A" },
              { value: "b", label: "B" },
            ]}
          />
        </>
      );
    }
    render(<Harness />);
    // Re-renders pass a brand-new tabs array each time; must not blow the
    // update depth (regression: effect dep was the array identity).
    fireEvent.click(screen.getByText("rerender"));
    fireEvent.click(screen.getByText("rerender"));
    expect(screen.getByRole("tab", { name: "A" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
