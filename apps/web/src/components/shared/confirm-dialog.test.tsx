import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

// @base-ui/react/dialog is mocked here to keep tests deterministic
// (it relies on browser APIs for portal/focus management).
vi.mock("@base-ui/react/dialog", async () => {
  const React = await import("react");

  return {
    Dialog: {
      Root: ({
        children,
        open,
        onOpenChange: _onOpenChange,
      }: {
        children: React.ReactNode;
        open: boolean;
        onOpenChange?: (open: boolean) => void;
      }) => (open ? <>{children}</> : null),
      Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      Backdrop: ({ className }: { className?: string }) => (
        <div data-testid="dialog-backdrop" className={className} />
      ),
      Popup: ({ children, className }: { children: React.ReactNode; className?: string }) => (
        <div data-testid="dialog-popup" className={className}>
          {children}
        </div>
      ),
      Title: ({ children, className }: { children: React.ReactNode; className?: string }) => (
        <h2 data-testid="dialog-title" className={className}>
          {children}
        </h2>
      ),
      Description: ({
        children,
        className,
      }: {
        children: React.ReactNode;
        className?: string;
      }) => (
        <p data-testid="dialog-description" className={className}>
          {children}
        </p>
      ),
      Close: ({
        children,
        render: renderProp,
      }: {
        children: React.ReactNode;
        render?: React.ReactElement;
      }) => {
        // Merge children into the render prop element if provided, otherwise
        // fall back to a plain button so event handlers from the render prop
        // are still forwarded.
        if (renderProp && React.isValidElement(renderProp)) {
          return React.cloneElement(renderProp as React.ReactElement<{ children: React.ReactNode }>, {
            children,
          });
        }
        return <button type="button">{children}</button>;
      },
    },
  };
});

describe("ConfirmDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    title: "Delete item",
    description: "This action cannot be undone.",
    onConfirm: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders title and description when open", () => {
    render(<ConfirmDialog {...defaultProps} />);

    expect(screen.getByTestId("dialog-title")).toHaveTextContent("Delete item");
    expect(screen.getByTestId("dialog-description")).toHaveTextContent(
      "This action cannot be undone.",
    );
  });

  it("renders default Cancel and Confirm labels", () => {
    render(<ConfirmDialog {...defaultProps} />);

    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
  });

  it("renders custom confirmLabel and cancelLabel", () => {
    render(
      <ConfirmDialog
        {...defaultProps}
        confirmLabel="Yes, delete"
        cancelLabel="No, keep it"
      />,
    );

    expect(screen.getByRole("button", { name: "Yes, delete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "No, keep it" })).toBeInTheDocument();
  });

  it("does not render when open is false", () => {
    render(<ConfirmDialog {...defaultProps} open={false} />);

    expect(screen.queryByTestId("dialog-title")).not.toBeInTheDocument();
  });

  it("calls onConfirm and onOpenChange(false) when Confirm is clicked", () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <ConfirmDialog
        {...defaultProps}
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("calls onCancel, onOpenChange(false) when Cancel is clicked", () => {
    const onCancel = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <ConfirmDialog
        {...defaultProps}
        onCancel={onCancel}
        onOpenChange={onOpenChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("calls only onOpenChange(false) when Cancel is clicked and no onCancel provided", () => {
    const onOpenChange = vi.fn();

    render(<ConfirmDialog {...defaultProps} onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders backdrop element", () => {
    render(<ConfirmDialog {...defaultProps} />);

    expect(screen.getByTestId("dialog-backdrop")).toBeInTheDocument();
  });

  // ── isPending behaviour ──────────────────────────────────────────────────

  it("isPending=true → confirm button is disabled", () => {
    render(<ConfirmDialog {...defaultProps} isPending />);

    expect(screen.getByRole("button", { name: /Processing/i })).toBeDisabled();
  });

  it("isPending=true → confirm button shows Processing... text", () => {
    render(<ConfirmDialog {...defaultProps} isPending />);

    expect(screen.getByRole("button", { name: /Processing/i })).toBeInTheDocument();
  });

  it("isPending=true → cancel button is disabled", () => {
    render(<ConfirmDialog {...defaultProps} isPending />);

    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("isPending=true → clicking confirm button does NOT call onConfirm (button is disabled)", () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <ConfirmDialog
        {...defaultProps}
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
        isPending
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Processing/i }));

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("isPending=true → clicking cancel button does NOT call onOpenChange(false)", () => {
    const onOpenChange = vi.fn();

    render(
      <ConfirmDialog
        {...defaultProps}
        onOpenChange={onOpenChange}
        isPending
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("isPending=false (default) → existing behavior unchanged", () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <ConfirmDialog
        {...defaultProps}
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
        isPending={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.getByRole("button", { name: "Confirm" })).not.toBeDisabled();
  });
});
