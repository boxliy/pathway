import {
  TextTrie,
  clampConfidence,
  type ParseCandidate,
  type ParseEvidence,
  type ParsedRegion,
  type ParseSpan,
  type RegionDataset,
  type RegionLevel,
  type RegionNode,
  type TrieMatch,
} from "@pathway/core";
import { removeZhCnRegionSuffix } from "@pathway/zh-cn-data";
import type { EntityCandidate } from "./extractors";
import { normalizeZhText } from "./normalizer";

export type PostalCodeRegionIndex = Record<string, string | string[]>;

export type RegionEvidenceProvider = {
  idCardCodeToRegionCodes?: (code: string) => string[];
  postalCodeToRegionCodes?: (postalCode: string) => string[];
};

export type RegionResolverOptions = {
  evidenceProvider?: RegionEvidenceProvider;
  postalCodeRegions?: PostalCodeRegionIndex;
  strict?: boolean;
};

export type RegionEntry = {
  aliases: string[];
  code: string;
  level: RegionLevel;
  name: string;
  parent?: RegionEntry;
};

export type RegionCandidate = TrieMatch<RegionEntry> & {
  evidence: ParseEvidence[];
  score: number;
};

export type RegionSelection = {
  candidates: ParseCandidate<RegionEntry>[];
  evidence: ParseEvidence[];
  region?: ParsedRegion;
  selected: {
    city?: RegionCandidate;
    district?: RegionCandidate;
    province?: RegionCandidate;
    street?: RegionCandidate;
  };
  spans: ParseSpan[];
  warnings: string[];
};

type CandidateState = {
  entry: RegionEntry;
  evidence: ParseEvidence[];
  score: number;
  span?: ParseSpan;
};

type RegionChain = {
  entries: RegionEntry[];
  score: number;
  states: CandidateState[];
};

export class RegionMatcher {
  private readonly aliases: Array<{ entry: RegionEntry; value: string }> = [];
  private readonly byCode = new Map<string, RegionEntry>();
  private readonly entries: RegionEntry[] = [];
  private readonly shadowableAliases: Array<{ entry: RegionEntry; value: string }> = [];
  private readonly shortProvinceAliases: Array<{ entry: RegionEntry; value: string }> = [];
  private readonly trie = new TextTrie<RegionEntry>();

  constructor(dataset: RegionDataset) {
    for (const region of dataset.regions) {
      this.addRegion(region);
    }
    for (const entry of this.entries) {
      const aliases = new Set([entry.name, ...entry.aliases, entry.level === "street" ? "" : removeZhCnRegionSuffix(entry.name)].filter(Boolean));
      for (const alias of aliases) {
        const value = normalizeZhText(alias);
        if (entry.level === "province" && value.length === 1) {
          this.shortProvinceAliases.push({ entry, value });
          continue;
        }
        this.aliases.push({ entry, value });
        if (value.length <= 3 && entry.level !== "street") {
          this.shadowableAliases.push({ entry, value });
        }
        this.trie.insert(value, entry);
      }
    }
  }

  findByCode(code: string) {
    return this.byCode.get(code);
  }

  match(input: string): RegionCandidate[] {
    const trieMatches = this.trie.matchAll(input);
    const shadowedMatches = this.matchShadowedAliases(input, trieMatches);
    const textMatches = uniqueMatches([...trieMatches, ...shadowedMatches]);
    const shortProvinceMatches = this.matchShortProvinceAliases(input, textMatches);
    return uniqueMatches([...textMatches, ...shortProvinceMatches])
      .map((match) => {
        const span = spanFromMatch(match);
        const evidence = [regionEvidence("region_text_match", "text", match.raw, match.data.code, scoreRegionMatch(match), span)];
        return {
          ...match,
          evidence,
          score: scoreRegionMatch(match),
        };
      })
      .sort((a, b) => b.score - a.score || b.end - b.start - (a.end - a.start));
  }

  private matchShadowedAliases(input: string, contextMatches: Array<TrieMatch<RegionEntry>>): Array<TrieMatch<RegionEntry>> {
    const matches: Array<TrieMatch<RegionEntry>> = [];
    for (const alias of this.shadowableAliases) {
      for (const context of contextMatches) {
        if (context.data.code === alias.entry.code || context.normalized.length <= alias.value.length) {
          continue;
        }
        const offset = context.raw.indexOf(alias.value);
        if (offset < 0) {
          continue;
        }
        const start = context.start + offset;
        matches.push({
          data: alias.entry,
          end: start + alias.value.length,
          normalized: alias.value,
          raw: input.slice(start, start + alias.value.length),
          start,
        });
      }
    }
    return matches;
  }

  private matchShortProvinceAliases(input: string, contextMatches: Array<TrieMatch<RegionEntry>>): Array<TrieMatch<RegionEntry>> {
    const matches: Array<TrieMatch<RegionEntry>> = [];
    for (const alias of this.shortProvinceAliases) {
      let start = input.indexOf(alias.value);
      while (start >= 0) {
        const end = start + alias.value.length;
        if (this.hasNearbyDescendantMatch(input, end, alias.entry, contextMatches)) {
          matches.push({
            data: alias.entry,
            end,
            normalized: alias.value,
            raw: input.slice(start, end),
            start,
          });
        }
        start = input.indexOf(alias.value, start + 1);
      }
    }
    return matches;
  }

  private hasNearbyDescendantMatch(
    input: string,
    aliasEnd: number,
    province: RegionEntry,
    contextMatches: Array<TrieMatch<RegionEntry>>,
  ) {
    return contextMatches.some((match) => {
      if (!isDescendantOf(match.data, province)) {
        return false;
      }
      if (match.start < aliasEnd || match.start - aliasEnd > 8) {
        return false;
      }
      return /^[\s,;:/|｜\-]*$/.test(input.slice(aliasEnd, match.start));
    });
  }

  private addRegion(region: RegionNode, parent?: RegionEntry) {
    const entry: RegionEntry = {
      aliases: region.aliases ?? [],
      code: region.code,
      level: region.level,
      name: region.name,
      parent,
    };
    this.byCode.set(entry.code, entry);
    this.entries.push(entry);
    for (const child of region.children ?? []) {
      this.addRegion(child, entry);
    }
  }
}

function isDescendantOf(entry: RegionEntry, ancestor: RegionEntry) {
  let current: RegionEntry | undefined = entry;
  while (current) {
    if (current.code === ancestor.code) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function uniqueMatches(matches: Array<TrieMatch<RegionEntry>>) {
  const seen = new Set<string>();
  const result: Array<TrieMatch<RegionEntry>> = [];
  for (const match of matches) {
    const key = `${match.data.code}:${match.start}:${match.end}:${match.normalized}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(match);
  }
  return result;
}

export function resolveRegion(
  matcher: RegionMatcher,
  input: string,
  entities: EntityCandidate[],
  options: RegionResolverOptions = {},
): RegionSelection {
  const states = new Map<string, CandidateState>();
  const textMatches = matcher.match(input);
  const hasRepeatedTextName = hasRepeatedTextRegion(textMatches);

  for (const match of textMatches) {
    addEvidence(states, match.data, match.evidence[0], match.score, spanFromMatch(match));
  }

  for (const entity of entities) {
    if (entity.kind === "id_card") {
      addIdCardEvidence(states, matcher, entity, options.evidenceProvider);
    }
    if (entity.kind === "postal_code") {
      addPostalCodeEvidence(states, matcher, entity, options);
    }
  }

  addHierarchyEvidence(states);
  recomputeScores(states);

  const chains = buildChains(states);
  const warnings: string[] = hasRepeatedTextName ? ["ambiguous_region"] : [];
  const candidates = toParseCandidates(states);
  const evidence = uniqueEvidence(candidates.flatMap((candidate) => candidate.evidence));

  if (!chains.length) {
    return {
      candidates,
      evidence,
      selected: {},
      spans: [],
      warnings,
    };
  }

  const best = chains[0];
  const ambiguous = findAmbiguousChains(best, chains);
  if (ambiguous.length) {
    pushWarning(warnings, "ambiguous_region");
  }

  if (options.strict && best.score < 1.2) {
    pushWarning(warnings, "low_confidence_region");
    return {
      candidates,
      evidence,
      selected: {},
      spans: [],
      warnings,
    };
  }

  const selected = selectedFromChain(best);
  addEvidenceConflictWarnings(warnings, selected, entities, options, matcher);
  return {
    candidates,
    evidence,
    region: regionToParsed(selected),
    selected,
    spans: regionSelectedSpans(selected),
    warnings,
  };
}

function addEvidenceConflictWarnings(
  warnings: string[],
  selected: RegionSelection["selected"],
  entities: EntityCandidate[],
  options: RegionResolverOptions,
  matcher: RegionMatcher,
) {
  const selectedDistrictCode = selected.district?.data.code;
  if (!selectedDistrictCode) {
    return;
  }

  for (const entity of entities) {
    if (entity.kind === "postal_code") {
      const codes = postalCodeRegionCodes(String(entity.value), options);
      if (codes.length && !codes.some((code) => isSameOrRelatedDistrict(matcher, code, selectedDistrictCode))) {
        pushWarning(warnings, "postal_code_region_conflict");
      }
    }
    if (entity.kind === "id_card") {
      const code = String(entity.value).slice(0, 6);
      const codes = options.evidenceProvider?.idCardCodeToRegionCodes?.(code) ?? [code];
      if (codes.length && !codes.some((candidateCode) => isSameOrRelatedDistrict(matcher, candidateCode, selectedDistrictCode))) {
        pushWarning(warnings, "id_card_region_conflict");
      }
    }
  }
}

function isSameOrRelatedDistrict(matcher: RegionMatcher, code: string, selectedDistrictCode: string) {
  const entry = matcher.findByCode(code);
  if (!entry) {
    return false;
  }
  if (entry.code === selectedDistrictCode) {
    return true;
  }
  let current: RegionEntry | undefined = entry.parent;
  while (current) {
    if (current.code === selectedDistrictCode) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function hasRepeatedTextRegion(matches: RegionCandidate[]) {
  const groups = new Map<string, Set<string>>();
  for (const match of matches) {
    const key = `${match.start}:${match.end}:${match.raw}:${match.data.level}`;
    let codes = groups.get(key);
    if (!codes) {
      codes = new Set();
      groups.set(key, codes);
    }
    codes.add(match.data.code);
  }
  return [...groups.values()].some((codes) => codes.size > 1);
}

function pushWarning(warnings: string[], warning: string) {
  if (!warnings.includes(warning)) {
    warnings.push(warning);
  }
}

function addIdCardEvidence(
  states: Map<string, CandidateState>,
  matcher: RegionMatcher,
  entity: EntityCandidate,
  provider?: RegionEvidenceProvider,
) {
  const code = String(entity.value).slice(0, 6);
  const codes = provider?.idCardCodeToRegionCodes?.(code) ?? [code];
  for (const candidateCode of codes) {
    const entry = matcher.findByCode(candidateCode);
    if (!entry) {
      continue;
    }
    addEvidence(
      states,
      entry,
      regionEvidence("region_id_card_code", "id_card", code, candidateCode, 0.93, entity.span),
      0.93,
    );
  }
}

function addPostalCodeEvidence(
  states: Map<string, CandidateState>,
  matcher: RegionMatcher,
  entity: EntityCandidate,
  options: RegionResolverOptions,
) {
  const postalCode = String(entity.value);
  for (const code of postalCodeRegionCodes(postalCode, options)) {
    const entry = matcher.findByCode(code);
    if (!entry) {
      continue;
    }
    addEvidence(
      states,
      entry,
      regionEvidence("region_postal_code", "postal_code", postalCode, code, 0.84, entity.span),
      0.84,
    );
  }
}

function postalCodeRegionCodes(postalCode: string, options: RegionResolverOptions) {
  const indexedCodes = codesFromPostalIndex(postalCode, options.postalCodeRegions);
  if (indexedCodes.length) {
    return [...new Set(indexedCodes)];
  }
  return [...new Set(options.evidenceProvider?.postalCodeToRegionCodes?.(postalCode) ?? [])];
}

function codesFromPostalIndex(postalCode: string, index?: PostalCodeRegionIndex) {
  if (!index) {
    return [];
  }
  for (let length = postalCode.length; length >= 2; length -= 1) {
    const value = index[postalCode.slice(0, length)];
    if (Array.isArray(value)) {
      return value;
    }
    if (value) {
      return [value];
    }
  }
  return [];
}

function addHierarchyEvidence(states: Map<string, CandidateState>) {
  const seeded = [...states.values()];
  for (const state of seeded) {
    let parent = state.entry.parent;
    while (parent) {
      addEvidence(
        states,
        parent,
        regionEvidence("region_hierarchy", "hierarchy", state.entry.name, state.entry.code, hierarchyScore(parent.level)),
        hierarchyScore(parent.level),
      );
      parent = parent.parent;
    }
  }
}

function addEvidence(
  states: Map<string, CandidateState>,
  entry: RegionEntry,
  evidence: ParseEvidence,
  score: number,
  span?: ParseSpan,
) {
  const existing = states.get(entry.code);
  if (!existing) {
    states.set(entry.code, {
      entry,
      evidence: [evidence],
      score,
      span,
    });
    return;
  }
  if (!existing.evidence.some((item) => evidenceKey(item) === evidenceKey(evidence))) {
    existing.evidence.push(evidence);
  }
  existing.score = Math.max(existing.score, score);
  if (!existing.span && span) {
    existing.span = span;
  }
}

function recomputeScores(states: Map<string, CandidateState>) {
  for (const state of states.values()) {
    const base = Math.max(...state.evidence.map((item) => item.confidence));
    const sourceBonus = new Set(state.evidence.map((item) => item.source)).size * 0.025;
    const hierarchyBonus = state.evidence.some((item) => item.source === "hierarchy") ? 0.02 : 0;
    state.score = clampConfidence(base + sourceBonus + hierarchyBonus);
  }
}

function buildChains(states: Map<string, CandidateState>) {
  const chains: RegionChain[] = [];
  for (const state of states.values()) {
    const entries = chainEntries(state.entry);
    const chainStates = entries
      .map((entry) => states.get(entry.code))
      .filter((item): item is CandidateState => Boolean(item));
    chains.push({
      entries,
      score: scoreChain(chainStates),
      states: chainStates,
    });
  }
  return uniqueChains(chains).sort((a, b) => b.score - a.score || deepestRank(b) - deepestRank(a));
}

function chainEntries(entry: RegionEntry) {
  const entries: RegionEntry[] = [];
  let current: RegionEntry | undefined = entry;
  while (current) {
    entries.unshift(current);
    current = current.parent;
  }
  return entries;
}

function scoreChain(states: CandidateState[]) {
  const deepest = states.reduce((best, state) => Math.max(best, levelRank(state.entry.level)), 0);
  const textCount = states.filter((state) => state.evidence.some((item) => item.source === "text")).length;
  const strongEvidence = states.some((state) => state.evidence.some((item) => item.source === "id_card" || item.source === "postal_code"));
  return states.reduce((total, state) => total + state.score, 0)
    + deepest * 0.03
    + textCount * 0.08
    + (strongEvidence ? 0.55 : 0)
    - overlappingTextPenalty(states);
}

function overlappingTextPenalty(states: CandidateState[]) {
  let penalty = 0;
  for (let index = 0; index < states.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < states.length; otherIndex += 1) {
      const left = states[index].span;
      const right = states[otherIndex].span;
      if (left && right && left.start < right.end && right.start < left.end) {
        penalty += 0.28;
      }
    }
  }
  return penalty;
}

function uniqueChains(chains: RegionChain[]) {
  const seen = new Set<string>();
  const result: RegionChain[] = [];
  for (const chain of chains) {
    const key = chain.entries.map((entry) => entry.code).join("/");
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(chain);
  }
  return result;
}

function findAmbiguousChains(best: RegionChain, chains: RegionChain[]) {
  const bestKey = chainKey(best);
  return chains.filter((chain) => {
    if (chainKey(chain) === bestKey) {
      return false;
    }
    if (deepestRank(chain) !== deepestRank(best)) {
      return false;
    }
    if (Math.abs(best.score - chain.score) > 0.04) {
      return false;
    }
    return !hasDisambiguatingEvidence(best);
  });
}

function hasDisambiguatingEvidence(chain: RegionChain) {
  const sources = new Set(chain.states.flatMap((state) => state.evidence.map((item) => item.source)));
  if (sources.has("id_card") || sources.has("postal_code")) {
    return true;
  }
  return chain.states.filter((state) => state.evidence.some((item) => item.source === "text")).length > 1;
}

function selectedFromChain(chain: RegionChain): RegionSelection["selected"] {
  const selected: RegionSelection["selected"] = {};
  for (const state of chain.states) {
    const candidate: RegionCandidate = {
      data: state.entry,
      end: state.span?.end ?? -1,
      evidence: state.evidence,
      normalized: state.entry.name,
      raw: state.span?.raw ?? state.entry.name,
      score: state.score,
      start: state.span?.start ?? -1,
    };
    selected[state.entry.level] = candidate;
  }
  return selected;
}

function regionToParsed(region: RegionSelection["selected"]): ParsedRegion | undefined {
  if (!region.province && !region.city && !region.district && !region.street) {
    return undefined;
  }
  return {
    city: region.city && regionPart(region.city),
    district: region.district && regionPart(region.district),
    province: region.province && regionPart(region.province),
    street: region.street && regionPart(region.street),
  };
}

function regionPart(candidate: RegionCandidate) {
  return {
    code: candidate.data.code,
    confidence: Math.min(0.98, candidate.score),
    name: candidate.data.name,
    span: candidate.start >= 0 ? { end: candidate.end, raw: candidate.raw, start: candidate.start } : undefined,
  };
}

function regionSelectedSpans(region: RegionSelection["selected"]): ParseSpan[] {
  return [region.province, region.city, region.district, region.street]
    .filter((candidate): candidate is RegionCandidate => candidate !== undefined && candidate.start >= 0)
    .map((candidate) => ({ end: candidate.end, raw: candidate.raw, start: candidate.start }));
}

function toParseCandidates(states: Map<string, CandidateState>): ParseCandidate<RegionEntry>[] {
  return [...states.values()]
    .map((state) => ({
      code: state.entry.code,
      confidence: Math.min(0.98, state.score),
      data: state.entry,
      evidence: state.evidence,
      level: state.entry.level,
      name: state.entry.name,
      score: state.score,
      span: state.span,
    }))
    .sort((a, b) => b.score - a.score || levelRank(b.level!) - levelRank(a.level!));
}

function uniqueEvidence(evidence: ParseEvidence[]) {
  const seen = new Set<string>();
  const result: ParseEvidence[] = [];
  for (const item of evidence) {
    const key = evidenceKey(item);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }
  return result;
}

function regionEvidence(
  type: string,
  source: ParseEvidence["source"],
  value: string,
  target: string,
  confidence: number,
  span?: ParseSpan,
): ParseEvidence {
  return {
    confidence: clampConfidence(confidence),
    source,
    span,
    target,
    type,
    value,
  };
}

function evidenceKey(evidence: ParseEvidence) {
  return `${evidence.type}:${evidence.source}:${evidence.value}:${evidence.target ?? ""}:${evidence.span?.start ?? -1}:${evidence.span?.end ?? -1}`;
}

function spanFromMatch(match: TrieMatch<RegionEntry>): ParseSpan {
  return { end: match.end, raw: match.raw, start: match.start };
}

function scoreRegionMatch(match: TrieMatch<RegionEntry>) {
  const lengthScore = Math.min(0.28, (match.end - match.start) / 24);
  const levelScore: Record<RegionLevel, number> = {
    province: 0.72,
    city: 0.76,
    district: 0.82,
    street: 0.86,
  };
  return Math.min(0.99, levelScore[match.data.level] + lengthScore);
}

function hierarchyScore(level: RegionLevel) {
  const scores: Record<RegionLevel, number> = {
    province: 0.22,
    city: 0.24,
    district: 0.28,
    street: 0.32,
  };
  return scores[level];
}

function deepestRank(chain: RegionChain) {
  return Math.max(...chain.entries.map((entry) => levelRank(entry.level)));
}

function levelRank(level: RegionLevel) {
  const ranks: Record<RegionLevel, number> = {
    province: 1,
    city: 2,
    district: 3,
    street: 4,
  };
  return ranks[level];
}

function chainKey(chain: RegionChain) {
  return chain.entries.map((entry) => entry.code).join("/");
}
