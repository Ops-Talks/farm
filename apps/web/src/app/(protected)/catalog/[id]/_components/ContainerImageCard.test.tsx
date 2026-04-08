import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContainerImageCard } from "./ContainerImageCard";
import type { ContainerImageMetadata } from "@/types/api";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FULL_CONTAINER_IMAGE: ContainerImageMetadata = {
  registry: "ecr",
  image: "myorg/myapp",
  latestTag: "1.2.3",
  digest: "sha256:abc123def456789012345678901234567890",
  pushedAt: "2024-06-15T12:00:00Z",
};

const MINIMAL_CONTAINER_IMAGE: ContainerImageMetadata = {
  registry: "dockerhub",
  image: "library/nginx",
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("ContainerImageCard", () => {
  it("renders nothing when containerImage is null", () => {
    const { container } = render(<ContainerImageCard containerImage={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when containerImage is undefined", () => {
    const { container } = render(<ContainerImageCard />);
    expect(container.firstChild).toBeNull();
  });

  it("renders 'Container Image' title when containerImage is set", () => {
    render(<ContainerImageCard containerImage={FULL_CONTAINER_IMAGE} />);
    expect(screen.getByText("Container Image")).toBeInTheDocument();
  });

  it("shows registry badge with human-readable label for ecr", () => {
    render(
      <ContainerImageCard containerImage={{ registry: "ecr", image: "myorg/myapp" }} />
    );
    expect(screen.getByText("AWS ECR")).toBeInTheDocument();
  });

  it("shows registry badge with human-readable label for gcr", () => {
    render(
      <ContainerImageCard containerImage={{ registry: "gcr", image: "myproject/myapp" }} />
    );
    expect(screen.getByText("GCP Artifact Registry")).toBeInTheDocument();
  });

  it("shows registry badge with human-readable label for dockerhub", () => {
    render(
      <ContainerImageCard containerImage={{ registry: "dockerhub", image: "library/nginx" }} />
    );
    expect(screen.getByText("Docker Hub")).toBeInTheDocument();
  });

  it("shows 'Harbor' registry badge for harbor type", () => {
    render(
      <ContainerImageCard containerImage={{ registry: "harbor", image: "myproject/myapp" }} />
    );
    expect(screen.getByText("Harbor")).toBeInTheDocument();
  });

  it("shows raw registry value for unknown registry type", () => {
    render(
      <ContainerImageCard containerImage={{ registry: "quay.io", image: "myorg/myapp" }} />
    );
    expect(screen.getByText("quay.io")).toBeInTheDocument();
  });

  it("displays image name in full", () => {
    render(<ContainerImageCard containerImage={FULL_CONTAINER_IMAGE} />);
    expect(screen.getByText("myorg/myapp")).toBeInTheDocument();
  });

  it("shows tag when latestTag is present", () => {
    render(<ContainerImageCard containerImage={FULL_CONTAINER_IMAGE} />);
    expect(screen.getByText("Tag")).toBeInTheDocument();
    expect(screen.getByText("1.2.3")).toBeInTheDocument();
  });

  it("does not show 'Tag' label when latestTag is absent", () => {
    render(<ContainerImageCard containerImage={MINIMAL_CONTAINER_IMAGE} />);
    expect(screen.queryByText("Tag")).not.toBeInTheDocument();
  });

  it("shows truncated digest (first 12 hex chars after 'sha256:' + '...')", () => {
    render(<ContainerImageCard containerImage={FULL_CONTAINER_IMAGE} />);
    expect(screen.getByText("Digest")).toBeInTheDocument();
    // "sha256:" + first 12 hex chars of "abc123def456789012345678901234567890" + "..."
    expect(screen.getByText("sha256:abc123def456...")).toBeInTheDocument();
  });

  it("does not show 'Digest' label when digest is absent", () => {
    render(<ContainerImageCard containerImage={MINIMAL_CONTAINER_IMAGE} />);
    expect(screen.queryByText("Digest")).not.toBeInTheDocument();
  });

  it("shows pushed date formatted as toLocaleDateString()", () => {
    render(<ContainerImageCard containerImage={FULL_CONTAINER_IMAGE} />);
    expect(screen.getByText("Pushed")).toBeInTheDocument();
    const expectedDate = new Date("2024-06-15T12:00:00Z").toLocaleDateString();
    expect(screen.getByText(expectedDate)).toBeInTheDocument();
  });

  it("does not show 'Pushed' label when pushedAt is absent", () => {
    render(<ContainerImageCard containerImage={MINIMAL_CONTAINER_IMAGE} />);
    expect(screen.queryByText("Pushed")).not.toBeInTheDocument();
  });
});
