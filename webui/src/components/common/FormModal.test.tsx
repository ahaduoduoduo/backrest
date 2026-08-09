import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FormModal } from "./FormModal";
import { renderWithProviders } from "../../test/render";

// NOTE: FormModal keeps outside-click dismissal opt-in. It is not covered by
// an automated test here: Zag's dismissable-layer wires
// outside-click detection through a raf-deferred effect plus a
// document-level capture-phase pointerdown listener that is itself attached
// on a setTimeout(0), and in this jsdom/vitest setup the dismiss path never
// fires regardless of the prop value (confirmed by flipping the flag and
// seeing onClose stay uncalled either way) - i.e. a test built around it
// would pass vacuously and provide false confidence rather than a real
// regression guard. Flagged as untestable in this environment rather than
// shipped as a misleading assertion.

describe("FormModal", () => {
  it("renders title, children, and footer in a portal dialog when open", async () => {
    renderWithProviders(
      <FormModal
        isOpen={true}
        onClose={vi.fn()}
        title="My Form Title"
        footer={<button>Save</button>}
      >
        <div>form body content</div>
      </FormModal>,
    );

    expect(await screen.findByText("My Form Title")).toBeInTheDocument();
    expect(screen.getByText("form body content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("does not render its content when isOpen is false", () => {
    renderWithProviders(
      <FormModal isOpen={false} onClose={vi.fn()} title="Hidden Title">
        <div>hidden body</div>
      </FormModal>,
    );

    expect(screen.queryByText("Hidden Title")).not.toBeInTheDocument();
    expect(screen.queryByText("hidden body")).not.toBeInTheDocument();
  });

  it("calls onClose when the close trigger is clicked", async () => {
    const onClose = vi.fn();
    const { user } = renderWithProviders(
      <FormModal isOpen={true} onClose={onClose} title="Closable">
        <div>body</div>
      </FormModal>,
    );

    await screen.findByText("Closable");
    // Target the close primitive by the part attribute Zag stamps onto it.
    const closeButton = document.querySelector(
      "[data-part='close-trigger']",
    ) as HTMLElement;
    expect(closeButton).toBeTruthy();
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
