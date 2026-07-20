import {
  createField,
  type ParseField,
  type ParseResult,
  type ParseSpan,
  type Parser,
  type RegionDataset,
} from "@pathway/core";
import { buildTokens, createDisplayAddressFields, extractAddressLine } from "./address-line";
import { createDefaultZhDataset, defaultRegionEvidenceProvider } from "./dataset";
import { extractEntities, findIdCardLikeSpans, findInvalidIdCard, findLabelSpans, type IdCardValidationMode } from "./extractors";
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
  idCardValidation?: IdCardValidationMode;
  nameMaxLength?: number;
  postalCodeRegions?: PostalCodeRegionIndex;
  strict?: boolean;
  unrecognizedText?: "address" | "separate";
};

export function parseZhAddress(input: string, options: ZhAddressParseOptions = {}) {
  return getZhAddressParser(options).parse(input);
}

export function createZhAddressParser(options: ZhAddressParseOptions = {}): Parser<string, ParseResult> {
  return new ZhAddressParser(options);
}

export { createDefaultZhDataset };

const parserCache = new Map<string, Parser<string, ParseResult>>();

function getZhAddressParser(options: ZhAddressParseOptions) {
  const cacheKey = parserCacheKey(options);
  if (!cacheKey) {
    return createZhAddressParser(options);
  }

  let parser = parserCache.get(cacheKey);
  if (!parser) {
    parser = createZhAddressParser(options);
    parserCache.set(cacheKey, parser);
  }
  return parser;
}

function parserCacheKey(options: ZhAddressParseOptions) {
  if (options.dataset || options.evidenceProvider || options.postalCodeRegions) {
    return "";
  }
  return JSON.stringify({
    idCardValidation: options.idCardValidation ?? "checksum",
    nameMaxLength: options.nameMaxLength ?? 4,
    strict: options.strict ?? false,
    unrecognizedText: options.unrecognizedText ?? "address",
  });
}

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
    const entities = extractEntities(normalized, this.nameMaxLength, labelSpans, {
      idCardValidation: this.options.idCardValidation,
    });
    const regionSelection = resolveRegion(this.matcher, normalized, entities, {
      ...this.options,
      evidenceProvider: this.options.evidenceProvider ?? defaultRegionEvidenceProvider,
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
      ...findIdCardLikeSpans(normalized),
      ...entities.map((entity) => entity.span).filter(Boolean) as ParseSpan[],
    ]);
    const addressField = addressLine
      ? createField(addressLine.value, addressLine.confidence, "heuristic", addressLine.span)
      : undefined;
    const { displayAddressLine, unrecognizedText } = createDisplayAddressFields(
      addressField,
      regionValue?.street?.name,
      this.options.unrecognizedText ?? "address",
    );
    const fields: Record<string, ParseField | undefined> = {
      addressLine: addressField,
      displayAddressLine,
      idCard: entities.find((entity) => entity.kind === "id_card"),
      phone: entities.find((entity) => entity.kind === "phone"),
      postalCode: entities.find((entity) => entity.kind === "postal_code"),
      recipientName: entities.find((entity) => entity.kind === "name"),
      unrecognizedText,
    };
    const tokens = buildTokens(normalized, labelSpans, regionSelection.spans, entities, addressField);
    const confidence = scoreResult(regionValue, fields, warnings);
    const components = {
      addressLine: fields.addressLine,
      displayAddressLine: fields.displayAddressLine,
      idCard: fields.idCard,
      phone: fields.phone,
      postalCode: fields.postalCode,
      recipientName: fields.recipientName,
      region: regionValue,
      unrecognizedText: fields.unrecognizedText,
    };

    return {
      addressLine: fields.addressLine,
      candidates: {
        regions: regionSelection.candidates,
      },
      components,
      confidence,
      displayAddressLine: fields.displayAddressLine,
      evidence: regionSelection.evidence,
      fields,
      idCard: fields.idCard,
      phone: fields.phone,
      postalCode: fields.postalCode,
      raw,
      recipientName: fields.recipientName,
      region: regionValue,
      tokens,
      unrecognizedText: fields.unrecognizedText,
      warnings,
    };
  }
}

export const zhAddressInternals = {
  normalizeZhText,
};
