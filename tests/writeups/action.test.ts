import { describe, expect, it } from "vitest";
import { uploadWriteupAction } from "../../src/app/training/new/actions";

describe("Upload Writeup Server Action", () => {
  it("processes a valid markdown file upload and returns metadata", async () => {
    const formData = new FormData();
    const mdBlob = new Blob(["# Machine: Baseme\n\nTarget IP: 10.10.10.10"], {
      type: "text/markdown",
    });
    const file = new File([mdBlob], "baseme.md", { type: "text/markdown" });
    formData.append("writeup", file);

    const result = await uploadWriteupAction(formData);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.filename).toBe("baseme.md");
      expect(result.metadata.format).toBe("md");
      expect(result.metadata.sha256Hash).toHaveLength(64);
      expect(result.metadata.wordCount).toBeGreaterThan(0);
      expect(result.metadata.characterCount).toBeGreaterThan(0);
    }
  });

  it("returns error when no file is provided in FormData", async () => {
    const formData = new FormData();
    const result = await uploadWriteupAction(formData);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("invalid_input");
    }
  });

  it("returns error for unsupported file format", async () => {
    const formData = new FormData();
    const badFile = new File([new Blob(["MZ..."])], "hack.exe", {
      type: "application/x-msdownload",
    });
    formData.append("writeup", badFile);

    const result = await uploadWriteupAction(formData);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("unsupported_format");
      expect(result.error).toContain("Allowed formats");
    }
  });
});
