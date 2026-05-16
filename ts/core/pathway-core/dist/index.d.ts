type RegionLevel = "province" | "city" | "district" | "street";
type RegionNode = {
    aliases?: string[];
    children?: RegionNode[];
    code: string;
    level: RegionLevel;
    name: string;
};
type RegionDataset = {
    regions: RegionNode[];
    version?: string;
};
type ParseSpan = {
    end: number;
    raw: string;
    start: number;
};
type ParseTokenKind = "label" | "separator" | "region" | "street" | "phone" | "id_card" | "postal_code" | "name" | "address" | "unknown";
type ParseToken = ParseSpan & {
    kind: ParseTokenKind;
    normalized: string;
};
type ParseField<T = string> = {
    confidence: number;
    source: "extractor" | "region" | "heuristic" | "fallback";
    span?: ParseSpan;
    value: T;
};
type ParsedRegionPart = {
    code?: string;
    confidence: number;
    name: string;
    span?: ParseSpan;
};
type ParsedRegion = {
    city?: ParsedRegionPart;
    district?: ParsedRegionPart;
    province?: ParsedRegionPart;
    street?: ParsedRegionPart;
};
type ParseResult = {
    addressLine?: ParseField;
    confidence: number;
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
type Parser<Input = string, Output extends ParseResult = ParseResult> = {
    parse(input: Input): Output;
};
type Normalizer = {
    normalize(input: string): string;
};
type Extractor<T = ParseField> = {
    extract(input: string): T[];
};
type Scorer<T> = {
    score(candidate: T): number;
};
type TrieMatch<T> = ParseSpan & {
    data: T;
    normalized: string;
};
declare class TextTrie<T> {
    private readonly root;
    insert(value: string, data: T): void;
    longestAt(input: string, start: number): TrieMatch<T>[];
    matchAll(input: string): TrieMatch<T>[];
}
declare function clampConfidence(value: number): number;
declare function createField<T>(value: T, confidence: number, source: ParseField<T>["source"], span?: ParseSpan): ParseField<T>;
declare function fullWidthToHalfWidth(input: string): string;
declare function uniqueBy<T>(items: T[], key: (item: T) => string): T[];

export { type Extractor, type Normalizer, type ParseField, type ParseResult, type ParseSpan, type ParseToken, type ParseTokenKind, type ParsedRegion, type ParsedRegionPart, type Parser, type RegionDataset, type RegionLevel, type RegionNode, type Scorer, TextTrie, type TrieMatch, clampConfidence, createField, fullWidthToHalfWidth, uniqueBy };
