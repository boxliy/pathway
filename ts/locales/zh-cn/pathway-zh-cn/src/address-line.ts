import {
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
    .replace(/[,:;|/()[\]{}<>]/g, " ")
    .replace(/\s+/g, "")
    .replace(/^\.+|\.+$/g, "")
    .replace(/^[，,;；:：/|｜\\\-.]+/, "")
    .replace(/[，,;；:：/|｜\\\-.]+$/, "")
    .replace(/^(省|市|区|县|镇|街道)+/, "")
    .trim();
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
