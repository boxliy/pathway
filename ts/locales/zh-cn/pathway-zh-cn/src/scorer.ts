import { clampConfidence, type ParseField, type ParsedRegion } from "@pathway/core";

export function scoreResult(region: ParsedRegion | undefined, fields: Record<string, ParseField | undefined>, warnings: string[]) {
  let score = 0.18;
  if (region?.province) score += 0.16;
  if (region?.city) score += 0.16;
  if (region?.district) score += 0.18;
  if (region?.street) score += 0.08;
  if (fields.addressLine?.value) score += 0.12;
  if (fields.recipientName?.value) score += 0.08;
  if (fields.phone?.value) score += 0.08;
  if (fields.idCard?.value) score += 0.06;
  return clampConfidence(score - warnings.length * 0.04);
}
