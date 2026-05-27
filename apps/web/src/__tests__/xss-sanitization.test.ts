/**
 * FARM-S600 — XSS Sanitization Tests
 *
 * Verifies that the DOMPurify sanitization applied in DocsClient.tsx and
 * advanced-search-modal.tsx strips dangerous HTML while preserving the
 * markup required for rendering Markdown and search highlights.
 *
 * isomorphic-dompurify uses a jsdom window on the server side, which is
 * exactly the environment Vitest runs in — so the sanitizer is fully
 * functional here without any mocking.
 */

import { describe, it, expect } from "vitest";
import DOMPurify from "isomorphic-dompurify";

// ---------------------------------------------------------------------------
// Helper: the exact sanitizer config used by DocsClient for rendered Markdown
// ---------------------------------------------------------------------------
function sanitizeMarkdown(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "h1", "h2", "h3", "h4", "h5", "h6",
      "p", "ul", "ol", "li", "blockquote",
      "pre", "code", "strong", "em", "a",
      "img", "table", "thead", "tbody", "tr",
      "th", "td", "hr", "br", "span", "div",
    ],
    ALLOWED_ATTR: ["href", "src", "alt", "class", "id", "target", "rel"],
    FORCE_BODY: true,
  });
}

// ---------------------------------------------------------------------------
// Helper: the exact sanitizer config used by advanced-search-modal for
// search highlight fragments (only <strong> is permitted).
// ---------------------------------------------------------------------------
function sanitizeHighlight(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["strong"],
    ALLOWED_ATTR: [],
  });
}

// ---------------------------------------------------------------------------
// Markdown sanitization (DocsClient config)
// ---------------------------------------------------------------------------
describe("sanitizeMarkdown — DocsClient XSS protection", () => {
  it("strips <script> tags and their content", () => {
    const input = "<p>Hello</p><script>alert('xss')</script>";
    const result = sanitizeMarkdown(input);
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("alert");
    expect(result).toContain("<p>Hello</p>");
  });

  it("strips <img> with onerror event handler attribute", () => {
    const input = '<img src="x" onerror="alert(1)">';
    const result = sanitizeMarkdown(input);
    // img is allowed but the onerror attribute must be stripped
    expect(result).not.toContain("onerror");
    expect(result).not.toContain("alert");
    // The img element itself may be preserved (src & alt are allowed)
    // but it must not carry the event handler
  });

  it("strips nested <script> inside allowed block tag", () => {
    const input = "<div><b><script>alert('nested')</script>text</b></div>";
    const result = sanitizeMarkdown(input);
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("alert");
  });

  it("strips SVG namespace script injection", () => {
    const input = "<svg><script>alert(1)</script></svg>";
    const result = sanitizeMarkdown(input);
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("alert(1)");
  });

  it("strips javascript: href from anchor tags", () => {
    const input = '<a href="javascript:alert(1)">click</a>';
    const result = sanitizeMarkdown(input);
    expect(result).not.toContain("javascript:");
  });

  it("strips on* event attributes from otherwise-allowed elements", () => {
    const input = '<p onclick="stealCookies()">text</p>';
    const result = sanitizeMarkdown(input);
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("stealCookies");
    // The <p> element itself should survive
    expect(result).toContain("<p>");
  });

  it("preserves safe Markdown HTML (headings, paragraphs, code)", () => {
    const input = "<h1>Title</h1><p>Para with <code>code</code></p>";
    const result = sanitizeMarkdown(input);
    expect(result).toContain("<h1>Title</h1>");
    expect(result).toContain("<code>code</code>");
  });

  it("preserves safe anchor with href and target", () => {
    const input =
      '<a href="https://example.com" target="_blank" rel="noopener">link</a>';
    const result = sanitizeMarkdown(input);
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('target="_blank"');
    expect(result).toContain("link</a>");
  });
});

// ---------------------------------------------------------------------------
// Highlight sanitization (advanced-search-modal config — ALLOWED_TAGS: ['strong'])
// ---------------------------------------------------------------------------
describe("sanitizeHighlight — advanced-search-modal XSS protection", () => {
  it("strips <script> tags in highlight fragments", () => {
    const input = "result <script>alert('xss')</script> text";
    const result = sanitizeHighlight(input);
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("alert");
    expect(result).toContain("result");
    expect(result).toContain("text");
  });

  it("strips <img> with onerror from highlight", () => {
    const input = "match <img src=x onerror=alert(1)> end";
    const result = sanitizeHighlight(input);
    expect(result).not.toContain("onerror");
    expect(result).not.toContain("alert");
    expect(result).not.toContain("<img");
  });

  it("strips nested script inside allowed strong tag", () => {
    const input = "<strong>match<script>alert(1)</script></strong>";
    const result = sanitizeHighlight(input);
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("alert");
    // The <strong> wrapper text should survive
    expect(result).toContain("match");
  });

  it("preserves valid <strong> highlight markup", () => {
    const input = "component <strong>platform</strong> registry";
    const result = sanitizeHighlight(input);
    expect(result).toContain("<strong>platform</strong>");
    expect(result).toContain("component");
    expect(result).toContain("registry");
  });

  it("strips SVG namespace injection in highlight", () => {
    const input = "<svg><script>alert(1)</script></svg>safe text";
    const result = sanitizeHighlight(input);
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("alert(1)");
    expect(result).toContain("safe text");
  });

  it("strips all attributes from <strong> (no on* or style)", () => {
    const input = '<strong onclick="evil()" style="color:red">text</strong>';
    const result = sanitizeHighlight(input);
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("style");
    // The text content should survive inside a clean <strong>
    expect(result).toContain("text");
  });

  it("strips data-uri img injection in highlight", () => {
    const input = '<img src="data:text/html,<script>alert(1)</script>">';
    const result = sanitizeHighlight(input);
    expect(result).not.toContain("<img");
    expect(result).not.toContain("data:text/html");
  });
});
