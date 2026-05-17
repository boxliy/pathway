export type RegionLevel = "province" | "city" | "district" | "street";

export type RegionNode = {
  aliases?: string[];
  children?: RegionNode[];
  code: string;
  level: RegionLevel;
  name: string;
};

export type RegionDataset = {
  regions: RegionNode[];
  version?: string;
};

export type ParseSpan = {
  end: number;
  raw: string;
  start: number;
};

export type ParseTokenKind =
  | "label"
  | "separator"
  | "region"
  | "street"
  | "phone"
  | "id_card"
  | "postal_code"
  | "name"
  | "address"
  | "unknown";

export type ParseToken = ParseSpan & {
  kind: ParseTokenKind;
  normalized: string;
};

export type ParseField<T = string> = {
  confidence: number;
  source: "extractor" | "region" | "heuristic" | "fallback";
  span?: ParseSpan;
  value: T;
};

export type ParsedRegionPart = {
  code?: string;
  confidence: number;
  name: string;
  span?: ParseSpan;
};

export type ParsedRegion = {
  city?: ParsedRegionPart;
  district?: ParsedRegionPart;
  province?: ParsedRegionPart;
  street?: ParsedRegionPart;
};

export type ParseEvidence = {
  confidence: number;
  message?: string;
  source: "text" | "postal_code" | "id_card" | "hierarchy" | "heuristic";
  span?: ParseSpan;
  target?: string;
  type: string;
  value: string;
};

export type ParseCandidate<T = unknown> = {
  code?: string;
  confidence: number;
  data?: T;
  evidence: ParseEvidence[];
  level?: RegionLevel;
  name: string;
  score: number;
  span?: ParseSpan;
};

export type ParseComponents = {
  addressLine?: ParseField;
  idCard?: ParseField;
  phone?: ParseField;
  postalCode?: ParseField;
  recipientName?: ParseField;
  region?: ParsedRegion;
};

export type ParseResult = {
  addressLine?: ParseField;
  candidates?: {
    regions?: ParseCandidate[];
  };
  components?: ParseComponents;
  confidence: number;
  evidence?: ParseEvidence[];
  fields: Record<string, ParseField | undefined>;
  idCard?: ParseField;
  phone?: ParseField;
  postalCode?: ParseField;
  raw: string;
  recipientName?: ParseField;
  region?: ParsedRegion;
  tokens: ParseToken[];
  warnings: string[];
};

export type Parser<Input = string, Output extends ParseResult = ParseResult> = {
  parse(input: Input): Output;
};

export type Normalizer = {
  normalize(input: string): string;
};

export type Extractor<T = ParseField> = {
  extract(input: string): T[];
};

export type Scorer<T> = {
  score(candidate: T): number;
};

export type TrieMatch<T> = ParseSpan & {
  data: T;
  normalized: string;
};

type TrieNode<T> = {
  children: Map<string, TrieNode<T>>;
  entries: Array<{ data: T; value: string }>;
};

export class TextTrie<T> {
  private readonly root: TrieNode<T> = { children: new Map(), entries: [] };

  insert(value: string, data: T) {
    if (!value) {
      return;
    }
    let node = this.root;
    for (const char of Array.from(value)) {
      let child = node.children.get(char);
      if (!child) {
        child = { children: new Map(), entries: [] };
        node.children.set(char, child);
      }
      node = child;
    }
    node.entries.push({ data, value });
  }

  longestAt(input: string, start: number): TrieMatch<T>[] {
    let node = this.root;
    let best: TrieMatch<T>[] = [];
    for (let offset = start; offset < input.length; offset += 1) {
      const child = node.children.get(input[offset]);
      if (!child) {
        break;
      }
      node = child;
      if (node.entries.length) {
        best = node.entries.map((entry) => ({
          data: entry.data,
          end: offset + 1,
          normalized: entry.value,
          raw: input.slice(start, offset + 1),
          start,
        }));
      }
    }
    return best;
  }

  matchAll(input: string): TrieMatch<T>[] {
    const matches: TrieMatch<T>[] = [];
    for (let index = 0; index < input.length; index += 1) {
      matches.push(...this.longestAt(input, index));
    }
    return matches;
  }
}

export function clampConfidence(value: number) {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

export function createField<T>(
  value: T,
  confidence: number,
  source: ParseField<T>["source"],
  span?: ParseSpan,
): ParseField<T> {
  return {
    confidence: clampConfidence(confidence),
    source,
    span,
    value,
  };
}

export function fullWidthToHalfWidth(input: string) {
  return input
    .replace(/\u3000/g, " ")
    .replace(/[\uFF01-\uFF5E]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0));
}

export function uniqueBy<T>(items: T[], key: (item: T) => string) {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const value = key(item);
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.push(item);
  }
  return result;
}
