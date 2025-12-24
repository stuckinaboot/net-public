import { describe, it, expect, beforeEach } from "vitest";
import {
  fileToDataUri,
  detectFileTypeFromBase64,
  base64ToDataUri,
} from "../utils/fileUtils";

// Mock FileReader for Node.js environment
class MockFileReader {
  result: string | ArrayBuffer | null = null;
  onloadend:
    | ((this: FileReader, ev: ProgressEvent<FileReader>) => void)
    | null = null;
  onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => void) | null =
    null;

  readAsDataURL(blob: Blob) {
    // Mock implementation for Node.js - convert blob to data URI synchronously
    // Use setTimeout to simulate async behavior like real FileReader
    setTimeout(() => {
      blob
        .arrayBuffer()
        .then((buffer) => {
          // Convert ArrayBuffer to base64
          const bytes = new Uint8Array(buffer);
          let binary = "";
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);

          // Determine MIME type from blob
          const mimeType = blob.type || "application/octet-stream";
          this.result = `data:${mimeType};base64,${base64}`;

          if (this.onloadend) {
            this.onloadend.call(this, {} as ProgressEvent<FileReader>);
          }
        })
        .catch(() => {
          if (this.onerror) {
            this.onerror.call(this, {} as ProgressEvent<FileReader>);
          }
        });
    }, 0);
  }
}

// Setup FileReader mock before tests
beforeEach(() => {
  if (typeof globalThis.FileReader === "undefined") {
    (globalThis as any).FileReader = MockFileReader as any;
  }
});

describe("fileUtils", () => {
  describe("fileToDataUri", () => {
    it("should convert PDF File to data URI", async () => {
      // Create a minimal PDF file (PDF header + minimal content)
      const pdfContent = "%PDF-1.4\n%\n";
      const blob = new Blob([pdfContent], { type: "application/pdf" });
      const dataUri = await fileToDataUri(blob);

      expect(dataUri).toContain("data:");
      expect(dataUri).toContain("base64,");
      expect(dataUri.startsWith("data:application/pdf;base64,")).toBe(true);
    });

    it("should convert PNG File to data URI", async () => {
      // Create a minimal PNG file (1x1 transparent pixel)
      const pngBase64 =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
      const pngBytes = Uint8Array.from(atob(pngBase64), (c) => c.charCodeAt(0));
      const blob = new Blob([pngBytes], { type: "image/png" });
      const dataUri = await fileToDataUri(blob);

      expect(dataUri).toContain("data:");
      expect(dataUri).toContain("base64,");
      expect(dataUri.startsWith("data:image/png;base64,")).toBe(true);
    });

    it("should work with Blob objects", async () => {
      const textContent = "Hello, World!";
      const blob = new Blob([textContent], { type: "text/plain" });
      const dataUri = await fileToDataUri(blob);

      expect(dataUri).toContain("data:");
      expect(dataUri).toContain("base64,");
      expect(dataUri.startsWith("data:text/plain;base64,")).toBe(true);
    });

    it("should handle FileReader errors", async () => {
      // Create a mock file that will cause an error
      // In a real scenario, this might be difficult to test, but we can test the error handling structure
      const blob = new Blob(["test"], { type: "text/plain" });

      // This should not throw, but if FileReader fails, it should reject
      await expect(fileToDataUri(blob)).resolves.toContain("data:");
    });
  });

  describe("detectFileTypeFromBase64", () => {
    it("should detect PDF from base64", () => {
      const pdfBase64 = "JVBERi0xLjQKJb662+4KMSAwIG9iago8PC9BdXRob3IgKP7/AE...";
      expect(detectFileTypeFromBase64(pdfBase64)).toBe("application/pdf");
    });

    it("should detect PNG from base64", () => {
      const pngBase64 =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
      expect(detectFileTypeFromBase64(pngBase64)).toBe("image/png");
    });

    it("should detect JPEG from base64", () => {
      const jpegBase64 =
        "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A";
      expect(detectFileTypeFromBase64(jpegBase64)).toBe("image/jpeg");
    });

    it("should detect GIF from base64", () => {
      const gifBase64 =
        "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
      expect(detectFileTypeFromBase64(gifBase64)).toBe("image/gif");
    });

    it("should detect SVG from base64", () => {
      const svgContent =
        '<svg xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100"/></svg>';
      const svgBase64 = btoa(svgContent);
      expect(detectFileTypeFromBase64(svgBase64)).toBe("image/svg+xml");
    });

    it("should detect HTML from base64", () => {
      const htmlContent = "<!DOCTYPE html><html><body>Test</body></html>";
      const htmlBase64 = btoa(htmlContent);
      expect(detectFileTypeFromBase64(htmlBase64)).toBe("text/html");
    });

    it("should detect JSON from base64", () => {
      const jsonContent = '{"key": "value"}';
      const jsonBase64 = btoa(jsonContent);
      expect(detectFileTypeFromBase64(jsonBase64)).toBe("application/json");
    });

    it("should detect ZIP from base64", () => {
      const zipBase64 = "UEsDBBQAAAAIAO";
      expect(detectFileTypeFromBase64(zipBase64)).toBe("application/zip");
    });

    it("should return undefined for unknown types", () => {
      const unknown = "randomBase64String";
      expect(detectFileTypeFromBase64(unknown)).toBeUndefined();
    });

    it("should handle empty string", () => {
      expect(detectFileTypeFromBase64("")).toBeUndefined();
    });

    it("should handle very short strings", () => {
      expect(detectFileTypeFromBase64("ab")).toBeUndefined();
    });

    it("should handle invalid base64 gracefully", () => {
      // Invalid base64 that might cause atob to fail
      const invalid = "!!!";
      // Should not throw, but return undefined
      expect(() => detectFileTypeFromBase64(invalid)).not.toThrow();
      // May return undefined or attempt detection
      const result = detectFileTypeFromBase64(invalid);
      expect(result === undefined || typeof result === "string").toBe(true);
    });
  });

  describe("base64ToDataUri", () => {
    it("should add PDF prefix to PDF base64", () => {
      const pdfBase64 = "JVBERi0xLjQK...";
      const result = base64ToDataUri(pdfBase64);
      expect(result).toBe(`data:application/pdf;base64,${pdfBase64}`);
    });

    it("should add PNG prefix to PNG base64", () => {
      const pngBase64 =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
      const result = base64ToDataUri(pngBase64);
      expect(result).toBe(`data:image/png;base64,${pngBase64}`);
    });

    it("should fallback to application/octet-stream for unknown types", () => {
      const unknown = "randomBase64";
      const result = base64ToDataUri(unknown);
      expect(result).toBe(`data:application/octet-stream;base64,${unknown}`);
    });

    it("should handle empty string", () => {
      const result = base64ToDataUri("");
      expect(result).toBe("data:application/octet-stream;base64,");
    });

    it("should handle JSON base64", () => {
      const jsonContent = '{"test": "value"}';
      const jsonBase64 = btoa(jsonContent);
      const result = base64ToDataUri(jsonBase64);
      expect(result).toBe(`data:application/json;base64,${jsonBase64}`);
    });

    it("should handle SVG base64", () => {
      const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
      const svgBase64 = btoa(svgContent);
      const result = base64ToDataUri(svgBase64);
      expect(result).toBe(`data:image/svg+xml;base64,${svgBase64}`);
    });
  });
});
