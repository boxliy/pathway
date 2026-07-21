import {
  createField,
  type ParseField,
  type ParseSpan,
  type ParseToken,
} from "@pathway/core";
import type { EntityCandidate } from "./extractors";
import { normalizeZhText } from "./normalizer";

export function extractAddressLine(input: string, spans: ParseSpan[]) {
  const merged = mergeSpans(spans.filter((span) => span.start >= 0));
  let cursor = 0;
  const parts: string[] = [];
  let start = 0;
  for (const span of merged) {
    if (cursor < span.start) {
      const part = input.slice(cursor, span.start);
      if (part.trim()) {
        if (!parts.length) {
          start = cursor;
        }
        parts.push(part);
      }
    }
    cursor = Math.max(cursor, span.end);
  }
  if (cursor < input.length) {
    if (!parts.length) {
      start = cursor;
    }
    parts.push(input.slice(cursor));
  }
  const value = cleanupAddress(parts.join(""));
  if (!value) {
    return null;
  }
  return {
    confidence: value.length >= 4 ? 0.76 : 0.54,
    span: { end: input.length, raw: value, start },
    value,
  };
}

export function createDisplayAddressFields(
  addressLine: ParseField | undefined,
  streetName: string | undefined,
  mode: "address" | "separate",
) {
  const baseValue = displayAddressValue(addressLine?.value ?? "", streetName);
  const parts = splitDisplayAddress(baseValue, mode);
  const displayAddressLine = parts.address
    ? createField(parts.address, addressLine?.confidence ?? 0.7, "heuristic", addressLine?.span)
    : undefined;
  const unrecognizedText = parts.unrecognizedText
    ? createField(parts.unrecognizedText, 0.54, "heuristic")
    : undefined;

  return { displayAddressLine, unrecognizedText };
}

export function buildTokens(
  input: string,
  labelSpans: ParseSpan[],
  regionSpans: ParseSpan[],
  entities: EntityCandidate[],
  addressField?: ParseField,
): ParseToken[] {
  const tokens: ParseToken[] = [];
  tokens.push(...labelSpans.map((span) => spanToToken(span, "label")));
  tokens.push(...regionSpans.map((span) => spanToToken(span, "region")));
  for (const entity of entities) {
    if (entity.span) {
      tokens.push(spanToToken(entity.span, entity.kind));
    }
  }
  if (addressField?.span) {
    tokens.push(spanToToken(addressField.span, "address"));
  }
  return tokens.sort((a, b) => a.start - b.start || a.end - b.end);
}

function cleanupAddress(input: string) {
  return input
    .replace(/\s+/g, "")
    .replace(/^\.+|\.+$/g, "")
    .replace(/^[，,;；:：/|｜\\\-.]+/, "")
    .replace(/[，,;；:：/|｜\\\-.]+$/, "")
    .replace(/^(省|市|区|县|镇|街道)+/, "")
    .trim();
}

function displayAddressValue(addressLine: string, streetName?: string) {
  const line = cleanupDisplayAddress(addressLine);
  const street = cleanupDisplayAddress(streetName ?? "");
  if (!street) {
    return line;
  }
  if (!line || line.startsWith(street)) {
    return line;
  }
  return `${street}${line}`;
}

function splitDisplayAddress(address: string, mode: "address" | "separate") {
  const value = cleanupDisplayAddress(address);
  if (mode !== "separate") {
    return { address: value };
  }

  const match = /(备注|货号|数量|姓名|电话|手机|证件|身份证|收件人|联系人)\s*[:：=|｜-]?\s*/.exec(value);
  if (match && match.index > 0) {
    return {
      address: cleanupDisplayAddressBoundary(value.slice(0, match.index)),
      unrecognizedText: `${match[1]}${cleanupDisplayAddress(value.slice(match.index + match[0].length))}`,
    };
  }

  const remarkIndex = value.indexOf("易碎");
  if (remarkIndex > 0) {
    return {
      address: cleanupDisplayAddressBoundary(value.slice(0, remarkIndex)),
      unrecognizedText: `备注${cleanupDisplayAddress(value.slice(remarkIndex))}`,
    };
  }

  return { address: value };
}

function cleanupDisplayAddressBoundary(input: string) {
  return cleanupDisplayAddress(input).replace(/[,，;；:：/|｜\\\-.]+$/, "");
}

function cleanupDisplayAddress(input: string) {
  return input
    .replace(/(真实姓名|收件人|联系人|联系电话|电话|手机|证件号|证件|身份证|所在地区|详细地址|地址|收件)\s*[:：=|｜-]?\s*/g, "")
    .replace(/\s+/g, "");
}

function spanToToken(span: ParseSpan, kind: ParseToken["kind"]): ParseToken {
  return {
    ...span,
    kind,
    normalized: normalizeZhText(span.raw),
  };
}

function mergeSpans(spans: ParseSpan[]) {
  const sorted = [...spans].sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: ParseSpan[] = [];
  for (const span of sorted) {
    const last = merged[merged.length - 1];
    if (!last || span.start > last.end) {
      merged.push({ ...span });
      continue;
    }
    last.end = Math.max(last.end, span.end);
    last.raw += span.raw;
  }
  return merged;
}
