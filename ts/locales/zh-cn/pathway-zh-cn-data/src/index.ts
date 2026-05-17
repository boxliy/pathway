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
  上海市: ["上海"],
  北京市: ["北京"],
  天津市: ["天津"],
  重庆市: ["重庆"],
  内蒙古自治区: ["内蒙古", "内蒙"],
  黑龙江省: ["黑龙江", "黑龙"],
  宁夏回族自治区: ["宁夏"],
  新疆维吾尔自治区: ["新疆"],
  广西壮族自治区: ["广西"],
  西藏自治区: ["西藏"],
  陕西省: ["陕西"],
};

const defaultStreetEvidence: ZhCnStreetEvidenceEntry[] = [
  { districtCode: "610113", code: "610113007", name: "丈八沟街道", aliases: ["丈八沟"] },
  { districtCode: "640106", code: "640106003", name: "上海西路街道", aliases: ["上海西路"] },
  { districtCode: "330702", code: "330702007", name: "西关街道", aliases: ["西关"] },
  { districtCode: "440309", code: "440309006", name: "观澜街道", aliases: ["观澜"] },
];

const defaultPostalEvidence: ZhCnPostalEvidenceEntry[] = [
  { postalCode: "100020", regionCode: "110105", confidence: 0.82 },
  { postalCode: "266100", regionCode: "370213", confidence: 0.78 },
  { postalCode: "542500", regionCode: "450332", confidence: 0.78 },
  { postalCode: "710061", regionCode: "610113", confidence: 0.82 },
  { postalCode: "710065", regionCode: "610113", confidence: 0.82 },
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
  return unique([
    ...(directAliases[name] ?? []),
    level === "street" ? "" : suffixAlias(name),
    normalizeRegionName(name),
  ].filter(Boolean));
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
