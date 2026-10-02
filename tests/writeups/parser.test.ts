import { describe, expect, it } from "vitest";
import {
  parseWriteupFile,
  validateWriteupFile,
  normalizeWriteupText,
  countWords,
  WriteupParseError,
  MAX_WRITEUP_SIZE_BYTES,
} from "../../src/modules/writeups";

// Valid minimal PDF 1.4 document containing text
const samplePdfContent = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 53 >> stream
BT
/F1 12 Tf
100 700 Td
(CTF Methodology Lab Writeup) Tj
ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000350 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
429
%%EOF`;

describe("Writeup Parser & Normalizer", () => {
  describe("Text Normalizer", () => {
    it("normalizes CRLF, trims lines, and collapses multiple blank lines", () => {
      const input = "Line 1   \r\n\r\n\r\n\r\nLine 2 with spaces   \r\n\r\nLine 3";
      const normalized = normalizeWriteupText(input);

      expect(normalized).toBe("Line 1\n\nLine 2 with spaces\n\nLine 3");
    });

    it("strips null bytes and control characters while preserving tabs and newlines", () => {
      const input = "Hello\x00World!\x07\x08 \t Good\x1B\x7F Morning\nNext Line";
      const normalized = normalizeWriteupText(input);

      expect(normalized).toBe("HelloWorld! \t Good Morning\nNext Line");
    });

    it("counts words correctly across whitespace variations", () => {
      expect(countWords("")).toBe(0);
      expect(countWords("   \n\t  ")).toBe(0);
      expect(countWords("The quick brown fox jumps")).toBe(5);
      expect(countWords("Port 80/tcp open http Apache/2.4.41")).toBe(5);
    });
  });

  describe("Validation", () => {
    it("validates allowed formats: .pdf, .txt, .md", () => {
      const buffer = Buffer.from("Valid writeup content");

      expect(
        validateWriteupFile({ filename: "writeup.txt", buffer }),
      ).toEqual({ format: "txt", cleanFilename: "writeup.txt" });

      expect(
        validateWriteupFile({ filename: "notes.MD", buffer }),
      ).toEqual({ format: "md", cleanFilename: "notes.MD" });
    });

    it("rejects unsupported extensions", () => {
      const buffer = Buffer.from("malicious content");

      expect(() =>
        validateWriteupFile({ filename: "payload.exe", buffer }),
      ).toThrowError(WriteupParseError);

      try {
        validateWriteupFile({ filename: "report.docx", buffer });
      } catch (err) {
        expect(err).toBeInstanceOf(WriteupParseError);
        expect((err as WriteupParseError).code).toBe("unsupported_format");
      }
    });

    it("rejects empty files (0 bytes)", () => {
      expect(() =>
        validateWriteupFile({ filename: "empty.txt", buffer: Buffer.alloc(0) }),
      ).toThrowError(/empty/);
    });

    it("rejects files exceeding 10 MB limit", () => {
      // Buffer larger than MAX_WRITEUP_SIZE_BYTES
      const oversizedBuffer = Buffer.alloc(MAX_WRITEUP_SIZE_BYTES + 1024);

      expect(() =>
        validateWriteupFile({ filename: "huge.txt", buffer: oversizedBuffer }),
      ).toThrowError(WriteupParseError);

      try {
        validateWriteupFile({ filename: "huge.txt", buffer: oversizedBuffer });
      } catch (err) {
        expect((err as WriteupParseError).code).toBe("file_too_large");
      }
    });

    it("rejects .pdf files missing %PDF- magic signature", () => {
      const fakePdf = Buffer.from("This is just text masquerading as pdf");

      expect(() =>
        validateWriteupFile({ filename: "fake.pdf", buffer: fakePdf }),
      ).toThrowError(/PDF signature/);
    });
  });

  describe("Document Parsing", () => {
    it("parses markdown writeups with code fences and headings", async () => {
      const mdContent = `# Machine: Cap
## Reconnaissance
Nmap scan results:
\`\`\`
PORT   STATE SERVICE VERSION
21/tcp open  ftp     vsftpd 3.0.3
80/tcp open  http    gunicorn
\`\`\`

## Initial Access
Pcap packet inspection revealed cleartext FTP credentials:
- Username: \`nathan\`
- Password: \`Buck3tH4TF0rd4Y5!\`
`;
      const result = await parseWriteupFile({
        filename: "Cap-writeup.md",
        buffer: Buffer.from(mdContent, "utf-8"),
      });

      expect(result.filename).toBe("Cap-writeup.md");
      expect(result.format).toBe("md");
      expect(result.sizeBytes).toBeGreaterThan(0);
      expect(result.sha256Hash).toHaveLength(64);
      expect(result.normalizedText).toContain("Machine: Cap");
      expect(result.normalizedText).toContain("Buck3tH4TF0rd4Y5!");
      expect(result.characterCount).toBe(result.normalizedText.length);
      expect(result.wordCount).toBeGreaterThan(20);
    });

    it("parses plain text writeups accurately", async () => {
      const txtContent = `Target: 10.10.10.93\r\nServices:\r\n- 22/tcp OpenSSH 8.2p1\r\n- 80/tcp Apache 2.4.41\r\n`;

      const result = await parseWriteupFile({
        filename: "notes.txt",
        buffer: Buffer.from(txtContent, "utf-8"),
      });

      expect(result.format).toBe("txt");
      expect(result.normalizedText).toBe(
        "Target: 10.10.10.93\nServices:\n- 22/tcp OpenSSH 8.2p1\n- 80/tcp Apache 2.4.41",
      );
      expect(result.wordCount).toBe(11);
    });

    it("parses valid PDF documents and extracts text content with page count", async () => {
      const pdfBuffer = Buffer.from(samplePdfContent, "binary");

      const result = await parseWriteupFile({
        filename: "HTB-Lab.pdf",
        buffer: pdfBuffer,
      });

      expect(result.filename).toBe("HTB-Lab.pdf");
      expect(result.format).toBe("pdf");
      expect(result.pageCount).toBe(1);
      expect(result.normalizedText).toContain("CTF Methodology Lab Writeup");
      expect(result.wordCount).toBe(4);
    });

    it("generates deterministic SHA-256 fingerprint for identical files", async () => {
      const content = "Deterministic writeup fingerprint check";
      const file1 = { filename: "a.txt", buffer: Buffer.from(content) };
      const file2 = { filename: "b.txt", buffer: Buffer.from(content) };

      const res1 = await parseWriteupFile(file1);
      const res2 = await parseWriteupFile(file2);

      expect(res1.sha256Hash).toBe(res2.sha256Hash);
    });

    it("rejects files that have only whitespace and no readable text", async () => {
      const blankTxt = Buffer.from("   \r\n\t   \n  ");

      await expect(
        parseWriteupFile({ filename: "blank.txt", buffer: blankTxt }),
      ).rejects.toMatchObject({
        code: "empty_file",
      });
    });
  });
});
