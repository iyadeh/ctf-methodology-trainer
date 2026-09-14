import type { contextObservations, sessionContexts } from "../../lib/db/schema";

export type ContextObservationRecord = typeof contextObservations.$inferSelect;
export type SessionContextRecord = typeof sessionContexts.$inferSelect;
export type SessionContextWithEvidence = SessionContextRecord & {
  observations: ContextObservationRecord[];
};
