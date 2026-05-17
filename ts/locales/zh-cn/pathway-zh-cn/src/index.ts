import {
  createField,
  type ParseField,
  type ParseResult,
  type ParseSpan,
  type Parser,
  type RegionDataset,
} from "@pathway/core";
import { buildTokens, extractAddressLine } from "./address-line";
import { createDefaultZhDataset, defaultPostalCodeRegions, defaultRegionEvidenceProvider } from "./dataset";
import { extractEntities, findInvalidIdCard, findLabelSpans } from "./extractors";
import { normalizeZhText } from "./normalizer";
import {
  RegionMatcher,
  resolveRegion,
  type PostalCodeRegionIndex,
  type RegionEvidenceProvider,
} from "./region-resolver";
import { scoreResult } from "./scorer";

export type ZhAddressParseOptions = {
  dataset?: RegionDataset;
  evidenceProvider?: RegionEvidenceProvider;
  nameMaxLength?: number;
  postalCodeRegions?: PostalCodeRegionIndex;
  strict?: boolean;
};

export function parseZhAddress(input: string, options: ZhAddressParseOptions = {}) {
  return createZhAddressParser(options).parse(input);
}

export function createZhAddressParser(options: ZhAddressParseOptions = {}): Parser<string, ParseResult> {
  return new ZhAddressParser(options);
}

export { createDefaultZhDataset };

class ZhAddressParser implements Parser<string, ParseResult> {
  private readonly matcher: RegionMatcher;
  private readonly nameMaxLength: number;
  private readonly options: ZhAddressParseOptions;

  constructor(options: ZhAddressParseOptions) {
    this.matcher = new RegionMatcher(options.dataset ?? createDefaultZhDataset());
    this.nameMaxLength = options.nameMaxLength ?? 4;
    this.options = options;
  }

  parse(raw: string): ParseResult {
    const normalized = normalizeZhText(raw);
    const labelSpans = findLabelSpans(normalized);
    const entities = extractEntities(normalized, this.nameMaxLength, labelSpans);
    const regionSelection = resolveRegion(this.matcher, normalized, entities, {
      ...this.options,
      evidenceProvider: this.options.evidenceProvider ?? defaultRegionEvidenceProvider,
      postalCodeRegions: this.options.postalCodeRegions ?? defaultPostalCodeRegions,
    });
    const warnings: string[] = [...regionSelection.warnings];

    const idCardInvalid = findInvalidIdCard(normalized, entities);
    if (idCardInvalid) {
      warnings.push("id_card_invalid_checksum");
    }

    const regionValue = regionSelection.region;
    if (regionValue?.district && !regionValue.city) {
      warnings.push("missing_city");
    }

    const addressLine = extractAddressLine(normalized, [
      ...labelSpans,
      ...regionSelection.spans,
      ...entities.map((entity) => entity.span).filter(Boolean) as ParseSpan[],
    ]);
    const addressField = addressLine
      ? createField(addressLine.value, addressLine.confidence, "heuristic", addressLine.span)
      : undefined;
    const fields: Record<string, ParseField | undefined> = {
      addressLine: addressField,
      idCard: entities.find((entity) => entity.kind === "id_card"),
      phone: entities.find((entity) => entity.kind === "phone"),
      postalCode: entities.find((entity) => entity.kind === "postal_code"),
      recipientName: entities.find((entity) => entity.kind === "name"),
    };
    const tokens = buildTokens(normalized, labelSpans, regionSelection.spans, entities, addressField);
    const confidence = scoreResult(regionValue, fields, warnings);
    const components = {
      addressLine: fields.addressLine,
      idCard: fields.idCard,
      phone: fields.phone,
      postalCode: fields.postalCode,
      recipientName: fields.recipientName,
      region: regionValue,
    };

    return {
      addressLine: fields.addressLine,
      candidates: {
        regions: regionSelection.candidates,
      },
      components,
      confidence,
      evidence: regionSelection.evidence,
      fields,
      idCard: fields.idCard,
      phone: fields.phone,
      postalCode: fields.postalCode,
      raw,
      recipientName: fields.recipientName,
      region: regionValue,
      tokens,
      warnings,
    };
  }
}

export const zhAddressInternals = {
  normalizeZhText,
};
