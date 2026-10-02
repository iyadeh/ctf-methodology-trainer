import type { GraphVerification } from "./types";

export class GenerationVerificationError extends Error {
  readonly verification: GraphVerification;

  constructor(
    message: string,
    verification: GraphVerification,
  ) {
    super(message);
    this.name = "GenerationVerificationError";
    this.verification = verification;
  }
}
