/**
 * File utilities for converting files to data URIs and detecting file types from base64 data.
 */

// Magic bytes (file signatures) for common file types
// These are the base64-encoded first few bytes of each file type
const PDF_MAGIC_BYTES = "JVBERi"; // %PDF-
const PNG_MAGIC_BYTES = "iVBORw0KGgo"; // PNG signature
const JPEG_MAGIC_BYTES = "/9j/"; // JPEG signature
const GIF_MAGIC_BYTES = "R0lGODlh"; // GIF87a or GIF89a
const WEBP_MAGIC_BYTES = "UklGRi"; // WebP signature (RIFF...WEBP)
const ZIP_MAGIC_BYTES = "UEsDB"; // PK (ZIP file)

/**
 * Converts a File or Blob to a data URI string.
 * Uses FileReader API to read the file and returns the full data URI including prefix.
 *
 * @param file - The File or Blob object to convert
 * @returns Promise that resolves to a data URI string (e.g., "data:application/pdf;base64,...")
 * @throws Error if FileReader fails to read the file
 *
 * @example
 * ```typescript
 * const file = event.target.files[0];
 * const dataUri = await fileToDataUri(file);
 * // Returns: "data:application/pdf;base64,JVBERi0xLjQK..."
 * ```
 */
export function fileToDataUri(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
      } else {
        reject(new Error("FileReader did not return a string result"));
      }
    };
    
    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Detects the MIME type from raw base64 data by checking magic bytes (file signatures).
 * Supports common file types: PDF, PNG, JPEG, GIF, WebP, SVG, HTML, MP3, MP4, ZIP, JSON.
 *
 * @param base64Data - Raw base64 string (without data URI prefix)
 * @returns MIME type string (e.g., "application/pdf") or undefined if type cannot be detected
 *
 * @example
 * ```typescript
 * const base64Data = "JVBERi0xLjQK..."; // Raw PDF base64
 * const mimeType = detectFileTypeFromBase64(base64Data);
 * // Returns: "application/pdf"
 * ```
 */
export function detectFileTypeFromBase64(base64Data: string): string | undefined {
  if (!base64Data || base64Data.length === 0) {
    return undefined;
  }

  try {
    // Check PDF
    if (base64Data.startsWith(PDF_MAGIC_BYTES)) {
      return "application/pdf";
    }

    // Check PNG
    if (base64Data.startsWith(PNG_MAGIC_BYTES)) {
      return "image/png";
    }

    // Check JPEG
    if (base64Data.startsWith(JPEG_MAGIC_BYTES)) {
      return "image/jpeg";
    }

    // Check GIF
    if (base64Data.startsWith(GIF_MAGIC_BYTES)) {
      return "image/gif";
    }

    // Check WebP (needs more characters to distinguish from other RIFF formats)
    if (base64Data.startsWith(WEBP_MAGIC_BYTES) && base64Data.length >= 20) {
      // Decode first few bytes to check for "WEBP" string
      try {
        const decoded = atob(base64Data.substring(0, 20));
        if (decoded.includes("WEBP")) {
          return "image/webp";
        }
      } catch {
        // If decoding fails, continue to other checks
      }
    }

    // Check SVG (text-based, contains <svg tag)
    if (base64Data.length > 10) {
      try {
        const decoded = atob(base64Data.substring(0, Math.min(200, base64Data.length)));
        if (decoded.includes("<svg") || decoded.includes("<SVG")) {
          return "image/svg+xml";
        }
      } catch {
        // If decoding fails, continue to other checks
      }
    }

    // Check HTML (text-based, contains <html or <!DOCTYPE)
    if (base64Data.length > 10) {
      try {
        const decoded = atob(base64Data.substring(0, Math.min(200, base64Data.length)));
        const lowerDecoded = decoded.toLowerCase();
        if (lowerDecoded.includes("<html") || lowerDecoded.includes("<!doctype")) {
          return "text/html";
        }
      } catch {
        // If decoding fails, continue to other checks
      }
    }

    // Check MP3 (ID3 tag or MPEG frame sync)
    // MP3 files can start with:
    // - ID3v2 tag: "ID3" (base64: "SUQz")
    // - MPEG frame sync: 0xFF 0xFB, 0xFF 0xF3, 0xFF 0xF2, 0xFF 0xFA, 0xFF 0xF9, etc.
    if (base64Data.startsWith("SUQz")) {
      return "audio/mpeg";
    }

    // Check for MPEG frame sync patterns in decoded bytes
    // MPEG frame sync: first byte is 0xFF, second byte starts with 0xF (0xF0-0xFF)
    if (base64Data.length >= 4) {
      try {
        const decoded = atob(base64Data.substring(0, 4));
        const bytes = new Uint8Array(decoded.length);
        for (let i = 0; i < decoded.length; i++) {
          bytes[i] = decoded.charCodeAt(i);
        }

        // Check for MPEG frame sync pattern: 0xFF followed by 0xF0-0xFF
        if (bytes[0] === 0xff && (bytes[1] & 0xf0) === 0xf0) {
          return "audio/mpeg";
        }
      } catch {
        // If decoding fails, continue to other checks
      }
    }

    // Check MP4 (contains "ftyp" in decoded bytes)
    if (base64Data.length > 20) {
      try {
        const decoded = atob(base64Data.substring(0, Math.min(50, base64Data.length)));
        if (decoded.includes("ftyp")) {
          return "video/mp4";
        }
      } catch {
        // If decoding fails, continue to other checks
      }
    }

    // Check ZIP
    if (base64Data.startsWith(ZIP_MAGIC_BYTES)) {
      return "application/zip";
    }

    // Check JSON (text-based, starts with { or [)
    if (base64Data.length > 2) {
      try {
        const decoded = atob(base64Data.substring(0, Math.min(10, base64Data.length)));
        const trimmed = decoded.trim();
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
          return "application/json";
        }
      } catch {
        // If decoding fails, return undefined
      }
    }

    return undefined;
  } catch (error) {
    // If any error occurs during detection, return undefined
    return undefined;
  }
}

/**
 * Converts raw base64 data to a data URI by detecting the file type and adding the appropriate prefix.
 * Falls back to "application/octet-stream" if the file type cannot be detected.
 *
 * @param base64Data - Raw base64 string (without data URI prefix)
 * @returns Complete data URI string (e.g., "data:application/pdf;base64,...")
 *
 * @example
 * ```typescript
 * const base64Data = "JVBERi0xLjQK..."; // Raw PDF base64
 * const dataUri = base64ToDataUri(base64Data);
 * // Returns: "data:application/pdf;base64,JVBERi0xLjQK..."
 * ```
 */
export function base64ToDataUri(base64Data: string): string {
  const mimeType = detectFileTypeFromBase64(base64Data) || "application/octet-stream";
  return `data:${mimeType};base64,${base64Data}`;
}

