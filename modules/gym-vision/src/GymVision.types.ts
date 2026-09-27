export type Classification = {
  /** A label from Apple Vision's image taxonomy, e.g. "barbell" or "screenshot". */
  identifier: string;
  /** 0–1. Scores are independent per label, so they don't add up to 1. */
  confidence: number;
};
