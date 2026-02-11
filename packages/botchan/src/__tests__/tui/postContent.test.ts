import { describe, it, expect } from "vitest";

/** Parse post text into title (first line) and body (rest) */
function parsePostContent(text: string | undefined): { title: string; body: string | null } {
  if (!text) return { title: "", body: null };

  const firstNewline = text.indexOf("\n");
  if (firstNewline === -1) {
    // No newline - entire text is title
    return { title: text.trim(), body: null };
  }

  const title = text.slice(0, firstNewline).trim();
  const body = text.slice(firstNewline + 1).trim();

  return { title, body: body || null };
}

/** Truncate title for list view */
function truncateTitle(title: string, maxLength = 70): string {
  if (title.length <= maxLength) return title;
  return title.slice(0, maxLength - 3) + "...";
}

describe("parsePostContent", () => {
  it("returns empty title and null body for undefined text", () => {
    const result = parsePostContent(undefined);
    expect(result).toEqual({ title: "", body: null });
  });

  it("returns empty title and null body for empty string", () => {
    const result = parsePostContent("");
    expect(result).toEqual({ title: "", body: null });
  });

  it("returns entire text as title when no newline", () => {
    const result = parsePostContent("Just a simple message");
    expect(result).toEqual({ title: "Just a simple message", body: null });
  });

  it("trims whitespace from title-only text", () => {
    const result = parsePostContent("  Padded message  ");
    expect(result).toEqual({ title: "Padded message", body: null });
  });

  it("splits on first newline into title and body", () => {
    const result = parsePostContent("My Title\nThis is the body");
    expect(result).toEqual({ title: "My Title", body: "This is the body" });
  });

  it("handles multiple newlines - body includes subsequent lines", () => {
    const result = parsePostContent("My Title\nFirst paragraph\n\nSecond paragraph");
    expect(result).toEqual({
      title: "My Title",
      body: "First paragraph\n\nSecond paragraph",
    });
  });

  it("handles title with blank line before body", () => {
    const result = parsePostContent("My Title\n\nThis is the body after blank line");
    expect(result).toEqual({
      title: "My Title",
      body: "This is the body after blank line",
    });
  });

  it("returns null body when only whitespace after title", () => {
    const result = parsePostContent("My Title\n   \n  ");
    expect(result).toEqual({ title: "My Title", body: null });
  });

  it("trims title and body", () => {
    const result = parsePostContent("  My Title  \n  Body content  ");
    expect(result).toEqual({ title: "My Title", body: "Body content" });
  });
});

describe("truncateTitle", () => {
  it("returns title unchanged if under max length", () => {
    const result = truncateTitle("Short title");
    expect(result).toBe("Short title");
  });

  it("returns title unchanged if exactly max length", () => {
    const title = "A".repeat(70);
    const result = truncateTitle(title);
    expect(result).toBe(title);
  });

  it("truncates and adds ellipsis if over max length", () => {
    const title = "A".repeat(80);
    const result = truncateTitle(title);
    expect(result).toBe("A".repeat(67) + "...");
    expect(result.length).toBe(70);
  });

  it("respects custom max length", () => {
    const result = truncateTitle("This is a longer title", 10);
    expect(result).toBe("This is...");
    expect(result.length).toBe(10);
  });
});
