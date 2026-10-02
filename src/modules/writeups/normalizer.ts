/**
 * Normalizes raw extracted text from writeups to prepare it for AI analysis.
 * - Standardizes line breaks to LF (\n).
 * - Strips non-printable control characters while preserving tabs and newlines.
 * - Removes trailing whitespace from individual lines.
 * - Collapses excessive blank lines (> 2 newlines into 2).
 * - Trims overall document whitespace.
 */
export function normalizeWriteupText(rawText: string): string {
  if (!rawText) return "";

  return (
    rawText
      // 1. Standardize line breaks
      .replace(/\r\n|\r/g, "\n")
      // 2. Remove null bytes and non-printable control characters (except \t and \n)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      // 3. Strip trailing whitespace from each line
      .split("\n")
      .map((line) => line.trimEnd())
      .join("\n")
      // 4. Collapse runs of 3+ newlines down to 2
      .replace(/\n{3,}/g, "\n\n")
      // 5. Trim leading and trailing whitespace
      .trim()
  );
}

/**
 * Counts words accurately in a text string.
 */
export function countWords(text: string): number {
  if (!text.trim()) return 0;
  const matches = text.trim().match(/\S+/g);
  return matches ? matches.length : 0;
}
