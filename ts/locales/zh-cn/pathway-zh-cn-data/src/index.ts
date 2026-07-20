import pcas from "china-division/dist/pcas-code.json";

export type ZhCnRegionLevel = "province" | "city" | "district" | "street";

export type ZhCnRegionSourceNode = {
  aliases?: string[];
  children?: ZhCnRegionSourceNode[];
  code: string;
  level: ZhCnRegionLevel;
  name: string;
};

export type ZhCnIndexedRegionNode = {
  aliases: string[];
  childrenCodes: string[];
  code: string;
  level: ZhCnRegionLevel;
  name: string;
  normalizedAliases: string[];
  normalizedName: string;
  parentCode?: string;
};

export type ZhCnRegionHierarchy = {
  city?: ZhCnIndexedRegionNode;
  district?: ZhCnIndexedRegionNode;
  province?: ZhCnIndexedRegionNode;
  street?: ZhCnIndexedRegionNode;
};

export type ZhCnPostalEvidenceEntry = {
  postalCode: string;
  regionCode: string;
  confidence: number;
};

export type ZhCnPostalRegionCandidate = {
  confidence: number;
  hierarchy: ZhCnRegionHierarchy;
  postalCode: string;
  region: ZhCnIndexedRegionNode;
};

export type ZhCnIdAddressCodeCandidate = {
  code: string;
  hierarchy: ZhCnRegionHierarchy;
  region: ZhCnIndexedRegionNode;
};

export type ZhCnStreetEvidenceEntry = {
  aliases?: string[];
  code: string;
  districtCode: string;
  name: string;
};

export type ZhCnRegionIndexOptions = {
  postalEvidence?: ZhCnPostalEvidenceEntry[];
  regions?: ZhCnRegionSourceNode[];
  streetEvidence?: ZhCnStreetEvidenceEntry[];
};

type CnDivisionNode = {
  c?: number | string;
  ch?: CnDivisionNode[];
  code?: number | string;
  children?: CnDivisionNode[];
  n?: string;
  name?: string;
};

const traditionalMap: Record<string, string> = {
  臺: "台",
  灣: "湾",
  陝: "陕",
  內: "内",
  蒙: "蒙",
  龍: "龙",
  寧: "宁",
  廣: "广",
  東: "东",
  區: "区",
  縣: "县",
  鄉: "乡",
  鎮: "镇",
};

const directAliases: Record<string, string[]> = {
  上海市: ["上海", "沪"],
  北京市: ["北京", "京"],
  天津市: ["天津", "津"],
  重庆市: ["重庆", "渝"],
  河北省: ["河北", "冀"],
  山西省: ["山西", "晋"],
  内蒙古自治区: ["内蒙古", "内蒙", "蒙"],
  辽宁省: ["辽宁", "辽"],
  吉林省: ["吉林", "吉"],
  黑龙江省: ["黑龙江", "黑龙", "黑"],
  江苏省: ["江苏", "苏"],
  浙江省: ["浙江", "浙"],
  安徽省: ["安徽", "皖"],
  福建省: ["福建", "闽"],
  江西省: ["江西", "赣"],
  山东省: ["山东", "鲁"],
  河南省: ["河南", "豫"],
  湖北省: ["湖北", "鄂"],
  湖南省: ["湖南", "湘"],
  广东省: ["广东", "粤"],
  广西壮族自治区: ["广西", "桂"],
  海南省: ["海南", "琼"],
  四川省: ["四川", "川", "蜀"],
  贵州省: ["贵州", "黔", "贵"],
  云南省: ["云南", "滇", "云"],
  西藏自治区: ["西藏", "藏"],
  陕西省: ["陕西", "陕", "秦"],
  甘肃省: ["甘肃", "甘", "陇"],
  青海省: ["青海", "青"],
  宁夏回族自治区: ["宁夏", "宁"],
  新疆维吾尔自治区: ["新疆", "新"],
};

const defaultStreetEvidence: ZhCnStreetEvidenceEntry[] = [
  { districtCode: "610113", code: "610113007", name: "丈八沟街道", aliases: ["丈八沟"] },
  { districtCode: "640106", code: "640106003", name: "上海西路街道", aliases: ["上海西路"] },
  { districtCode: "330702", code: "330702007", name: "西关街道", aliases: ["西关"] },
  { districtCode: "440309", code: "440309006", name: "观澜街道", aliases: ["观澜"] },
];

const defaultPostalEvidence: ZhCnPostalEvidenceEntry[] = [
  { postalCode: "010020", regionCode: "150105", confidence: 0.82 },
  { postalCode: "030032", regionCode: "140105", confidence: 0.82 },
  { postalCode: "050011", regionCode: "130102", confidence: 0.82 },
  { postalCode: "100020", regionCode: "110105", confidence: 0.82 },
  { postalCode: "110001", regionCode: "210102", confidence: 0.82 },
  { postalCode: "130022", regionCode: "220102", confidence: 0.82 },
  { postalCode: "150010", regionCode: "230102", confidence: 0.82 },
  { postalCode: "200120", regionCode: "310115", confidence: 0.82 },
  { postalCode: "210018", regionCode: "320102", confidence: 0.82 },
  { postalCode: "215008", regionCode: "320508", confidence: 0.82 },
  { postalCode: "230001", regionCode: "340103", confidence: 0.82 },
  { postalCode: "250002", regionCode: "370103", confidence: 0.82 },
  { postalCode: "266001", regionCode: "370202", confidence: 0.82 },
  { postalCode: "266100", regionCode: "370213", confidence: 0.78 },
  { postalCode: "300100", regionCode: "120104", confidence: 0.82 },
  { postalCode: "310013", regionCode: "330106", confidence: 0.82 },
  { postalCode: "321000", regionCode: "330702", confidence: 0.82 },
  { postalCode: "330006", regionCode: "360102", confidence: 0.82 },
  { postalCode: "350001", regionCode: "350102", confidence: 0.82 },
  { postalCode: "361001", regionCode: "350203", confidence: 0.82 },
  { postalCode: "402160", regionCode: "500118", confidence: 0.82 },
  { postalCode: "410006", regionCode: "430104", confidence: 0.82 },
  { postalCode: "430061", regionCode: "420106", confidence: 0.82 },
  { postalCode: "450003", regionCode: "410105", confidence: 0.82 },
  { postalCode: "510630", regionCode: "440106", confidence: 0.82 },
  { postalCode: "518052", regionCode: "440305", confidence: 0.82 },
  { postalCode: "518110", regionCode: "440309", confidence: 0.82 },
  { postalCode: "530022", regionCode: "450103", confidence: 0.82 },
  { postalCode: "542500", regionCode: "450332", confidence: 0.78 },
  { postalCode: "550002", regionCode: "520102", confidence: 0.82 },
  { postalCode: "570203", regionCode: "460108", confidence: 0.82 },
  { postalCode: "610041", regionCode: "510107", confidence: 0.82 },
  { postalCode: "650032", regionCode: "530102", confidence: 0.82 },
  { postalCode: "710061", regionCode: "610113", confidence: 0.82 },
  { postalCode: "710065", regionCode: "610113", confidence: 0.82 },
  { postalCode: "730030", regionCode: "620102", confidence: 0.82 },
  { postalCode: "750002", regionCode: "640106", confidence: 0.82 },
  { postalCode: "810000", regionCode: "630103", confidence: 0.82 },
  { postalCode: "830002", regionCode: "650102", confidence: 0.82 },
  { postalCode: "850000", regionCode: "540102", confidence: 0.82 },
];

export class ZhCnRegionIndex {
  readonly regions: ZhCnIndexedRegionNode[];

  private readonly byCode = new Map<string, ZhCnIndexedRegionNode>();
  private readonly byName = new Map<string, ZhCnIndexedRegionNode[]>();
  private readonly postalToRegion = new Map<string, ZhCnPostalRegionCandidate[]>();
  private readonly districtToPostal = new Map<string, ZhCnPostalRegionCandidate[]>();

  constructor(regions: ZhCnRegionSourceNode[], postalEvidence: ZhCnPostalEvidenceEntry[] = []) {
    this.regions = this.indexRegions(regions);
    this.indexPostalEvidence(postalEvidence);
  }

  lookupByCode(code: string) {
    return this.byCode.get(code);
  }

  lookupByName(name: string) {
    return [...(this.byName.get(normalizeRegionName(name)) ?? [])];
  }

  lookupAmbiguousName(name: string) {
    const matches = this.lookupByName(name);
    return matches.length > 1 ? matches : [];
  }

  lookupChildren(parentCode: string) {
    const parent = this.byCode.get(parentCode);
    return parent?.childrenCodes.map((code) => this.byCode.get(code)).filter(isRegion) ?? [];
  }

  lookupHierarchy(codeOrRegion: string | ZhCnIndexedRegionNode): ZhCnRegionHierarchy | undefined {
    const region = typeof codeOrRegion === "string" ? this.lookupByCode(codeOrRegion) : codeOrRegion;
    if (!region) {
      return undefined;
    }

    const hierarchy: ZhCnRegionHierarchy = {};
    let current: ZhCnIndexedRegionNode | undefined = region;
    while (current) {
      hierarchy[current.level] = current;
      current = current.parentCode ? this.lookupByCode(current.parentCode) : undefined;
    }
    return hierarchy;
  }

  lookupPostalCode(postalCode: string) {
    return [...(this.postalToRegion.get(postalCode) ?? [])];
  }

  lookupDistrictPostalCodes(districtCode: string) {
    return [...(this.districtToPostal.get(districtCode) ?? [])];
  }

  lookupIdAddressCode(code: string): ZhCnIdAddressCodeCandidate | undefined {
    if (!/^\d{6}$/.test(code)) {
      return undefined;
    }
    const region = this.lookupByCode(code);
    if (!region || region.level !== "district") {
      return undefined;
    }
    const hierarchy = this.lookupHierarchy(region);
    if (!hierarchy) {
      return undefined;
    }
    return { code, hierarchy, region };
  }

  private indexRegions(regions: ZhCnRegionSourceNode[]) {
    const indexed: ZhCnIndexedRegionNode[] = [];
    const visit = (region: ZhCnRegionSourceNode, parent?: ZhCnRegionSourceNode) => {
      const aliases = unique([...(region.aliases ?? []), ...regionAliases(region.name, region.level)]);
      const node: ZhCnIndexedRegionNode = {
        aliases,
        childrenCodes: region.children?.map((child) => child.code) ?? [],
        code: region.code,
        level: region.level,
        name: normalizeRegionName(region.name),
        normalizedAliases: unique(aliases.map(normalizeRegionName)),
        normalizedName: normalizeRegionName(region.name),
        parentCode: parent?.code,
      };

      indexed.push(node);
      this.byCode.set(node.code, node);
      for (const name of unique([node.normalizedName, ...node.normalizedAliases])) {
        pushMapValue(this.byName, name, node);
      }
      for (const child of region.children ?? []) {
        visit(child, region);
      }
    };

    for (const region of regions) {
      visit(region);
    }
    return indexed;
  }

  private indexPostalEvidence(postalEvidence: ZhCnPostalEvidenceEntry[]) {
    for (const entry of postalEvidence) {
      const region = this.lookupByCode(entry.regionCode);
      const hierarchy = region && this.lookupHierarchy(region);
      const district = hierarchy?.district;
      if (!region || !hierarchy || !district) {
        continue;
      }

      const candidate: ZhCnPostalRegionCandidate = {
        confidence: entry.confidence,
        hierarchy,
        postalCode: entry.postalCode,
        region,
      };
      pushMapValue(this.postalToRegion, entry.postalCode, candidate);
      pushMapValue(this.districtToPostal, district.code, candidate);
    }
  }
}

export function createDefaultZhCnRegionIndex(options: ZhCnRegionIndexOptions = {}) {
  const regions = options.regions ?? createDefaultZhCnRegions(options.streetEvidence);
  return new ZhCnRegionIndex(regions, options.postalEvidence ?? defaultPostalEvidence);
}

export function createDefaultZhCnRegions(streetEvidence = defaultStreetEvidence) {
  const regions = (pcas as CnDivisionNode[]).map((node) => sourceToRegion(node, "province"));
  applyStreetEvidence(regions, streetEvidence);
  return regions;
}

export function normalizeRegionName(input: string) {
  let output = input
    .replace(/\u3000/g, " ")
    .replace(/[\uFF01-\uFF5E]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/\s+/g, "")
    .trim();

  for (const [source, target] of Object.entries(traditionalMap)) {
    output = output.replace(new RegExp(source, "g"), target);
  }
  return output;
}

function sourceToRegion(node: CnDivisionNode, level: ZhCnRegionLevel, parentName?: string): ZhCnRegionSourceNode {
  const nextLevel: Record<ZhCnRegionLevel, ZhCnRegionLevel> = {
    province: "city",
    city: "district",
    district: "street",
    street: "street",
  };

  const rawName = node.n ?? node.name;
  const rawCode = node.c ?? node.code;
  if (!rawName || rawCode === undefined) {
    throw new Error("Invalid region data node");
  }
  const children = node.ch ?? node.children;
  const normalizedName = normalizeRegionName(rawName);
  const name = level === "city" && isDirectMunicipality(parentName) && (normalizedName === "市辖区" || normalizedName === "县")
    ? parentName!
    : normalizedName;
  return {
    aliases: regionAliases(name, level),
    children: children?.map((child) => sourceToRegion(child, nextLevel[level], name)),
    code: String(rawCode),
    level,
    name,
  };
}

function isDirectMunicipality(name?: string) {
  return name === "北京市" || name === "上海市" || name === "天津市" || name === "重庆市";
}

function applyStreetEvidence(regions: ZhCnRegionSourceNode[], streetEvidence: ZhCnStreetEvidenceEntry[]) {
  const byCode = new Map(flattenSourceRegions(regions).map((region) => [region.code, region]));
  for (const street of streetEvidence) {
    const district = byCode.get(street.districtCode);
    if (!district) {
      continue;
    }
    const children = district.children ?? [];
    const existing = children.find((child) => child.code === street.code);
    if (existing) {
      existing.aliases = unique([...(existing.aliases ?? []), ...(street.aliases ?? [])]);
      continue;
    }
    district.children = [
      ...children,
      {
        aliases: street.aliases,
        code: street.code,
        level: "street",
        name: street.name,
      },
    ];
  }
}

function flattenSourceRegions(regions: ZhCnRegionSourceNode[]): ZhCnRegionSourceNode[] {
  const result: ZhCnRegionSourceNode[] = [];
  for (const region of regions) {
    result.push(region, ...flattenSourceRegions(region.children ?? []));
  }
  return result;
}

function regionAliases(name: string, level: ZhCnRegionLevel) {
  return createZhCnRegionAliases(name, level);
}

export function createZhCnRegionAliases(name: string, level: ZhCnRegionLevel) {
  return unique([
    ...(directAliases[name] ?? []),
    level === "street" ? "" : removeZhCnRegionSuffix(name),
    normalizeRegionName(name),
  ].filter(Boolean));
}

export function preferredZhCnRegionShortAlias(name: string, level: ZhCnRegionLevel) {
  return createZhCnRegionAliases(name, level).find((alias) => alias.length === 1)
    ?? removeZhCnRegionSuffix(name);
}

export function removeZhCnRegionSuffix(name: string) {
  const suffixes = [
    "维吾尔自治区",
    "壮族自治区",
    "回族自治区",
    "自治区",
    "特别行政区",
    "新区",
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

function pushMapValue<T>(map: Map<string, T[]>, key: string, value: T) {
  const values = map.get(key);
  if (values) {
    values.push(value);
    return;
  }
  map.set(key, [value]);
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function isRegion(region: ZhCnIndexedRegionNode | undefined): region is ZhCnIndexedRegionNode {
  return Boolean(region);
}
