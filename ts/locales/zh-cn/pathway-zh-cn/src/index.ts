import pca from "cn-division/dist/code/pca.json";
import {
  TextTrie,
  createField,
  fullWidthToHalfWidth,
  type ParseField,
  type ParseResult,
  type ParseSpan,
  type ParseToken,
  type ParsedRegion,
  type Parser,
  type RegionDataset,
  type RegionLevel,
  type RegionNode,
  type TrieMatch,
} from "@pathway/core";

export type ZhAddressParseOptions = {
  dataset?: RegionDataset;
  nameMaxLength?: number;
};

type SourceNode = {
  c: number | string;
  ch?: SourceNode[];
  n: string;
};

type RegionEntry = {
  aliases: string[];
  code: string;
  level: RegionLevel;
  name: string;
  parent?: RegionEntry;
};

type RegionCandidate = TrieMatch<RegionEntry> & {
  score: number;
};

type EntityCandidate = ParseField & {
  kind: "phone" | "id_card" | "postal_code" | "name";
};

const labelWords = [
  "收货人",
  "收件人",
  "联系人",
  "联系电话",
  "联系人手机号码",
  "手机号码",
  "手机号",
  "手机",
  "电话",
  "姓名",
  "收货地址",
  "收件地址",
  "所在地区",
  "所在地",
  "联系地址",
  "送货地址",
  "详细地址",
  "地区",
  "地址",
  "身份证号码",
  "身份证号",
  "身份证",
  "证件号码",
  "证件号",
  "邮政编码",
  "邮编",
];

const knownSurnames = new Set([
  "赵", "钱", "孙", "李", "周", "吴", "郑", "王", "冯", "陈", "卫", "蒋", "沈", "韩", "杨",
  "朱", "秦", "尤", "许", "何", "吕", "施", "张", "孔", "曹", "严", "华", "金", "魏", "陶",
  "姜", "谢", "邹", "喻", "柏", "章", "苏", "潘", "葛", "范", "彭", "郎", "鲁", "韦", "马", "刘",
  "苗", "方", "俞", "任", "袁", "柳", "鲍", "史", "唐", "费", "薛", "雷", "贺", "倪", "汤",
  "罗", "毕", "郝", "邬", "安", "常", "乐", "于", "时", "傅", "皮", "齐", "康", "伍", "余",
  "卜", "顾", "孟", "黄", "萧", "尹", "姚", "邵", "汪", "祁", "毛", "米", "贝", "明", "臧",
  "成", "戴", "谈", "宋", "庞", "熊", "纪", "舒", "项", "董", "梁", "杜", "阮", "蓝", "季",
  "麻", "强", "贾", "江", "童", "颜", "郭", "梅", "盛", "林", "徐", "高", "夏", "蔡", "田",
  "樊", "胡", "凌", "万", "柯", "卢", "莫", "房", "解", "丁", "邓", "洪", "左", "石", "崔",
  "龚", "程", "邢", "陆", "翁", "钟", "曾", "赖", "卓", "叶", "欧", "游", "司马", "上官", "欧阳",
  "诸葛", "东方", "皇甫", "尉迟", "公孙", "轩辕", "令狐", "宇文", "长孙", "慕容", "司徒", "司空",
]);

const nameSuffixBlockList = ["省", "市", "区", "县", "镇", "街道", "村", "地区", "地址", "电话"];

const traditionalMap: Record<string, string> = {
  臺: "台",
  台灣: "台湾",
  張: "张",
  劉: "刘",
  節: "节",
  霽: "霁",
  機: "机",
  灣: "湾",
  華: "华",
  婺城區: "婺城区",
  關: "关",
  廣: "广",
  東: "东",
  門: "门",
  區: "区",
  縣: "县",
  鄉: "乡",
  鎮: "镇",
  街道辦: "街道办",
  聯: "联",
  聯系人: "联系人",
  聯絡人: "联系人",
  聯繫人: "联系人",
  電話: "电话",
  電: "电",
  號碼: "号码",
  號: "号",
  詳細: "详细",
  貨: "货",
  郵編: "邮编",
  郵政編碼: "邮政编码",
  證件: "证件",
  身份證: "身份证",
  收貨人: "收货人",
  收件地址: "收件地址",
};

const directAlias: Record<string, string> = {
  上海市: "上海",
  上海: "上海",
  北京市: "北京",
  北京: "北京",
  天津市: "天津",
  天津: "天津",
  重庆市: "重庆",
  重庆: "重庆",
  内蒙: "内蒙古自治区",
  黑龙: "黑龙江省",
  宁夏: "宁夏回族自治区",
  新疆: "新疆维吾尔自治区",
  广西: "广西壮族自治区",
  西藏: "西藏自治区",
};

const streetOverlay: Array<{ districtCode: string; code: string; name: string; aliases?: string[] }> = [
  { districtCode: "610113", code: "610113007", name: "丈八沟街道", aliases: ["丈八沟"] },
  { districtCode: "640106", code: "640106003", name: "上海西路街道", aliases: ["上海西路"] },
  { districtCode: "330702", code: "330702007", name: "西关街道", aliases: ["西关"] },
  { districtCode: "440309", code: "440309006", name: "观澜街道", aliases: ["观澜"] },
];

export function parseZhAddress(input: string, options: ZhAddressParseOptions = {}) {
  return createZhAddressParser(options).parse(input);
}

export function createZhAddressParser(options: ZhAddressParseOptions = {}): Parser<string, ParseResult> {
  return new ZhAddressParser(options);
}

export function createDefaultZhDataset(): RegionDataset {
  const regions = (pca as SourceNode[]).map((node) => sourceToRegion(node, "province"));
  applyStreetOverlay(regions);
  return {
    regions,
    version: "zh-cn-default",
  };
}

class ZhAddressParser implements Parser<string, ParseResult> {
  private readonly matcher: RegionMatcher;
  private readonly nameMaxLength: number;

  constructor(options: ZhAddressParseOptions) {
    this.matcher = new RegionMatcher(options.dataset ?? createDefaultZhDataset());
    this.nameMaxLength = options.nameMaxLength ?? 4;
  }

  parse(raw: string): ParseResult {
    const normalized = normalizeZhText(raw);
    const labelSpans = findLabelSpans(normalized);
    const entities = extractEntities(normalized, this.nameMaxLength, labelSpans);
    const regionCandidates = this.matcher.match(normalized);
    const region = chooseRegion(regionCandidates);
    const regionSpans = regionSelectedSpans(region);
    const warnings: string[] = [];

    const idCardInvalid = findInvalidIdCard(normalized, entities);
    if (idCardInvalid) {
      warnings.push("id_card_invalid_checksum");
    }

    const regionValue = regionToParsed(region);
    if (regionValue?.district && !regionValue.city) {
      warnings.push("missing_city");
    }
    if (hasAmbiguousRegion(regionCandidates, region)) {
      warnings.push("ambiguous_region");
    }

    const addressLine = extractAddressLine(normalized, [
      ...labelSpans,
      ...regionSpans,
      ...entities.map((entity) => entity.span).filter(Boolean) as ParseSpan[],
    ]);
    const addressField = addressLine
      ? createField(addressLine.value, addressLine.confidence, "heuristic", addressLine.span)
      : undefined;
    const tokens = buildTokens(normalized, labelSpans, regionSpans, entities, addressField);
    const fields: Record<string, ParseField | undefined> = {
      addressLine: addressField,
      idCard: entities.find((entity) => entity.kind === "id_card"),
      phone: entities.find((entity) => entity.kind === "phone"),
      postalCode: entities.find((entity) => entity.kind === "postal_code"),
      recipientName: entities.find((entity) => entity.kind === "name"),
    };
    const confidence = scoreResult(regionValue, fields, warnings);

    return {
      addressLine: fields.addressLine,
      confidence,
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

class RegionMatcher {
  private readonly entries: RegionEntry[] = [];
  private readonly trie = new TextTrie<RegionEntry>();

  constructor(dataset: RegionDataset) {
    for (const region of dataset.regions) {
      this.addRegion(region);
    }
    for (const entry of this.entries) {
      const aliases = new Set([entry.name, ...entry.aliases, suffixAlias(entry.name)].filter(Boolean));
      for (const alias of aliases) {
        this.trie.insert(normalizeZhText(alias), entry);
      }
    }
  }

  match(input: string): RegionCandidate[] {
    return this.trie.matchAll(input)
      .map((match) => ({
        ...match,
        score: scoreRegionMatch(match),
      }))
      .sort((a, b) => b.score - a.score || b.end - b.start - (a.end - a.start));
  }

  private addRegion(region: RegionNode, parent?: RegionEntry) {
    const entry: RegionEntry = {
      aliases: region.aliases ?? [],
      code: region.code,
      level: region.level,
      name: region.name,
      parent,
    };
    this.entries.push(entry);
    for (const child of region.children ?? []) {
      this.addRegion(child, entry);
    }
  }
}

function sourceToRegion(node: SourceNode, level: RegionLevel): RegionNode {
  const nextLevel: Record<RegionLevel, RegionLevel> = {
    province: "city",
    city: "district",
    district: "street",
    street: "street",
  };
  return {
    aliases: regionAliases(node.n),
    children: node.ch?.map((child) => sourceToRegion(child, nextLevel[level])),
    code: String(node.c),
    level,
    name: normalizeZhText(node.n),
  };
}

function applyStreetOverlay(regions: RegionNode[]) {
  const districts = flattenRegions(regions).filter((region) => region.level === "district");
  for (const street of streetOverlay) {
    const district = districts.find((node) => node.code === street.districtCode);
    if (!district) {
      continue;
    }
    district.children = [
      ...(district.children ?? []),
      {
        aliases: street.aliases,
        code: street.code,
        level: "street",
        name: street.name,
      },
    ];
  }
}

function flattenRegions(regions: RegionNode[]): RegionNode[] {
  const result: RegionNode[] = [];
  for (const region of regions) {
    result.push(region, ...flattenRegions(region.children ?? []));
  }
  return result;
}

function normalizeZhText(input: string) {
  let output = fullWidthToHalfWidth(input)
    .replace(/\r|\n|\t/g, " ")
    .replace(/，|。|、|；|：|（|）|【|】|《|》|「|」|『|』/g, (char) => {
      const map: Record<string, string> = {
        "，": ",",
        "。": ".",
        "、": ",",
        "；": ";",
        "：": ":",
        "（": "(",
        "）": ")",
        "【": "[",
        "】": "]",
        "《": "<",
        "》": ">",
        "「": "\"",
        "」": "\"",
        "『": "\"",
        "』": "\"",
      };
      return map[char] ?? char;
    });
  const keys = Object.keys(traditionalMap).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    output = output.replace(new RegExp(key, "g"), traditionalMap[key]);
  }
  return output.replace(/\s+/g, " ").trim();
}

function findLabelSpans(input: string): ParseSpan[] {
  const trie = new TextTrie<string>();
  for (const label of labelWords) {
    trie.insert(normalizeZhText(label), label);
  }
  return trie.matchAll(input).map((match) => ({
    end: consumeLabelSeparator(input, match.end),
    raw: input.slice(match.start, consumeLabelSeparator(input, match.end)),
    start: match.start,
  }));
}

function consumeLabelSeparator(input: string, start: number) {
  let end = start;
  while (end < input.length && /[\s:：,，|｜-]/.test(input[end])) {
    end += 1;
  }
  return end;
}

function extractEntities(input: string, nameMaxLength: number, labelSpans: ParseSpan[]): EntityCandidate[] {
  const entities: EntityCandidate[] = [];
  const idCard = firstValidIdCard(input);
  if (idCard) {
    entities.push({ ...createField(idCard.raw.toUpperCase(), 0.99, "extractor", idCard), kind: "id_card" });
  }
  const phone = firstPhone(input, entities.map((entity) => entity.span).filter(Boolean) as ParseSpan[]);
  if (phone) {
    entities.push({ ...createField(phone.raw.replace(/[^\d]/g, ""), 0.96, "extractor", phone), kind: "phone" });
  }
  const postalCode = firstPostalCode(input, entities.map((entity) => entity.span).filter(Boolean) as ParseSpan[]);
  if (postalCode) {
    entities.push({ ...createField(postalCode.raw, 0.84, "extractor", postalCode), kind: "postal_code" });
  }
  const name = firstName(input, [...labelSpans, ...entities.map((entity) => entity.span).filter(Boolean) as ParseSpan[]], nameMaxLength);
  if (name) {
    entities.push({ ...createField(name.raw, 0.76, "heuristic", name), kind: "name" });
  }
  return entities;
}

function firstValidIdCard(input: string): ParseSpan | null {
  const pattern = /[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]/g;
  for (const match of input.matchAll(pattern)) {
    if (match.index === undefined) {
      continue;
    }
    const raw = match[0];
    if (isValidIdCard(raw)) {
      return { end: match.index + raw.length, raw, start: match.index };
    }
  }
  return null;
}

function findInvalidIdCard(input: string, entities: EntityCandidate[]) {
  const hasValidId = entities.some((entity) => entity.kind === "id_card");
  if (hasValidId) {
    return false;
  }
  return /[1-9]\d{16}[0-9Xx]/.test(input);
}

function isValidIdCard(value: string) {
  const code = value.toUpperCase();
  const regionCodes = new Set([
    "11", "12", "13", "14", "15", "21", "22", "23", "31", "32", "33", "34", "35", "36", "37",
    "41", "42", "43", "44", "45", "46", "50", "51", "52", "53", "54", "61", "62", "63", "64",
    "65", "71", "81", "82", "91",
  ]);
  if (!regionCodes.has(code.slice(0, 2))) {
    return false;
  }
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const parity = ["1", "0", "X", "9", "8", "7", "6", "5", "4", "3", "2"];
  const sum = weights.reduce((total, weight, index) => total + Number(code[index]) * weight, 0);
  return parity[sum % 11] === code[17];
}

function firstPhone(input: string, excludes: ParseSpan[]) {
  const pattern = /((?:\+?86[- ]?)?1[3-9]\d[- ]?\d{4}[- ]?\d{4})|(?:0\d{2,3}[- ]?\d{7,8}(?:[- ]?\d{1,6})?)/g;
  for (const match of input.matchAll(pattern)) {
    if (match.index === undefined || overlapsAny(match.index, match.index + match[0].length, excludes)) {
      continue;
    }
    return { end: match.index + match[0].length, raw: match[0], start: match.index };
  }
  return null;
}

function firstPostalCode(input: string, excludes: ParseSpan[]) {
  const pattern = /(?<!\d)\d{6}(?!\d)/g;
  for (const match of input.matchAll(pattern)) {
    if (match.index === undefined || overlapsAny(match.index, match.index + match[0].length, excludes)) {
      continue;
    }
    return { end: match.index + match[0].length, raw: match[0], start: match.index };
  }
  return null;
}

function firstName(input: string, excludes: ParseSpan[], maxLength: number) {
  const label = /(?:收货人|收件人|联系人|姓名)\s*[:：]?\s*([\u4E00-\u9FA5]{2,6})/.exec(input);
  if (label?.index !== undefined) {
    const value = label[1].slice(0, maxLength);
    if (looksLikeName(value)) {
      const start = label.index + label[0].lastIndexOf(label[1]);
      return { end: start + value.length, raw: value, start };
    }
  }
  const pattern = /[\u4E00-\u9FA5]{2,6}/g;
  for (const match of input.matchAll(pattern)) {
    if (match.index === undefined || overlapsAny(match.index, match.index + match[0].length, excludes)) {
      continue;
    }
    const value = match[0].slice(0, maxLength);
    if (looksLikeName(value)) {
      return { end: match.index + value.length, raw: value, start: match.index };
    }
  }
  return null;
}

function looksLikeName(value: string) {
  if (value.length < 2 || value.length > 4) {
    return false;
  }
  if (![...knownSurnames].some((surname) => value.startsWith(surname))) {
    return false;
  }
  return !nameSuffixBlockList.some((suffix) => value.endsWith(suffix));
}

function chooseRegion(candidates: RegionCandidate[]) {
  const streets = candidates.filter((candidate) => candidate.data.level === "street");
  const districts = candidates.filter((candidate) => candidate.data.level === "district");
  const cities = candidates.filter((candidate) => candidate.data.level === "city");
  const provinces = candidates.filter((candidate) => candidate.data.level === "province");
  const street = streets[0];
  const district = bestWithHierarchy(districts, street?.data.parent);
  const city = bestWithHierarchy(cities, district?.data.parent ?? street?.data.parent?.parent);
  const province = bestWithHierarchy(provinces, city?.data.parent ?? district?.data.parent?.parent ?? street?.data.parent?.parent?.parent);

  return {
    city,
    district,
    province,
    street,
  };
}

function bestWithHierarchy(candidates: RegionCandidate[], expected?: RegionEntry) {
  if (!expected) {
    return candidates[0];
  }
  return candidates.find((candidate) => candidate.data.code === expected.code) ?? {
    data: expected,
    end: -1,
    normalized: expected.name,
    raw: expected.name,
    score: 0.72,
    start: -1,
  };
}

function regionToParsed(region: ReturnType<typeof chooseRegion>): ParsedRegion | undefined {
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

function regionSelectedSpans(region: ReturnType<typeof chooseRegion>): ParseSpan[] {
  return [region.province, region.city, region.district, region.street]
    .filter((candidate): candidate is RegionCandidate => Boolean(candidate) && candidate.start >= 0)
    .map((candidate) => ({ end: candidate.end, raw: candidate.raw, start: candidate.start }));
}

function hasAmbiguousRegion(candidates: RegionCandidate[], selected: ReturnType<typeof chooseRegion>) {
  const selectedCodes = new Set([selected.province, selected.city, selected.district, selected.street]
    .filter(Boolean)
    .map((candidate) => candidate!.data.code));
  const competitive = candidates.filter((candidate) => !selectedCodes.has(candidate.data.code) && candidate.score >= 0.82);
  return competitive.length > 0;
}

function extractAddressLine(input: string, spans: ParseSpan[]) {
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

function cleanupAddress(input: string) {
  return input
    .replace(/[,:;|()[\]{}<>]/g, " ")
    .replace(/\s+/g, "")
    .replace(/^\.+|\.+$/g, "")
    .replace(/^(省|市|区|县|镇|街道)+/, "")
    .trim();
}

function buildTokens(
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

function spanToToken(span: ParseSpan, kind: ParseToken["kind"]): ParseToken {
  return {
    ...span,
    kind,
    normalized: normalizeZhText(span.raw),
  };
}

function scoreResult(region: ParsedRegion | undefined, fields: Record<string, ParseField | undefined>, warnings: string[]) {
  let score = 0.18;
  if (region?.province) score += 0.16;
  if (region?.city) score += 0.16;
  if (region?.district) score += 0.18;
  if (region?.street) score += 0.08;
  if (fields.addressLine?.value) score += 0.12;
  if (fields.recipientName?.value) score += 0.08;
  if (fields.phone?.value) score += 0.08;
  if (fields.idCard?.value) score += 0.06;
  return Math.max(0, Math.min(1, score - warnings.length * 0.04));
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

function overlapsAny(start: number, end: number, spans: ParseSpan[]) {
  return spans.some((span) => start < span.end && end > span.start);
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

function regionAliases(name: string) {
  return [
    directAlias[name],
    suffixAlias(name),
    normalizeZhText(name),
  ].filter((value): value is string => Boolean(value && value !== name));
}

function suffixAlias(name: string) {
  const suffixes = [
    "维吾尔自治区",
    "壮族自治区",
    "回族自治区",
    "自治区",
    "特别行政区",
    "省",
    "市",
    "区",
    "县",
    "街道",
    "镇",
    "乡",
  ];
  for (const suffix of suffixes) {
    if (name.endsWith(suffix) && name.length > suffix.length + 1) {
      return name.slice(0, -suffix.length);
    }
  }
  return "";
}

export const zhAddressInternals = {
  normalizeZhText,
};
