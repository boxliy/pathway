import {
  createDefaultZhCnRegionIndex,
  createDefaultZhCnRegions,
  type ZhCnRegionSourceNode,
} from "@pathway/zh-cn-data";
import type { RegionDataset, RegionNode } from "@pathway/core";
import type { RegionEvidenceProvider } from "./region-resolver";

export const defaultPostalCodeRegions: Record<string, string> = {
  "010020": "150105",
  "030032": "140105",
  "050011": "130102",
  "100020": "110105",
  "110001": "210102",
  "130022": "220102",
  "150010": "230102",
  "200120": "310115",
  "210018": "320102",
  "215008": "320508",
  "230001": "340103",
  "250002": "370103",
  "266001": "370202",
  "300100": "120104",
  "310013": "330106",
  "321000": "330702",
  "330006": "360102",
  "350001": "350102",
  "361001": "350203",
  "402160": "500118",
  "410006": "430104",
  "430061": "420106",
  "450003": "410105",
  "510630": "440106",
  "518052": "440305",
  "518110": "440309",
  "530022": "450103",
  "550002": "520102",
  "570203": "460108",
  "610041": "510107",
  "650032": "530102",
  "710061": "610113",
  "730030": "620102",
  "750002": "640106",
  "810000": "630103",
  "830002": "650102",
  "850000": "540102",
};

const defaultRegionIndex = createDefaultZhCnRegionIndex();

export const defaultRegionEvidenceProvider: RegionEvidenceProvider = {
  idCardCodeToRegionCodes: (code) => {
    const candidate = defaultRegionIndex.lookupIdAddressCode(code);
    return candidate ? [candidate.region.code] : [];
  },
  postalCodeToRegionCodes: (postalCode) => {
    const candidates = defaultRegionIndex.lookupPostalCode(postalCode);
    return candidates.map((candidate) => candidate.region.code);
  },
};

export function createDefaultZhDataset(): RegionDataset {
  return {
    regions: createDefaultZhCnRegions().map(toRegionNode),
    version: "zh-cn-default",
  };
}

function toRegionNode(region: ZhCnRegionSourceNode): RegionNode {
  return {
    aliases: region.aliases,
    children: region.children?.map(toRegionNode),
    code: region.code,
    level: region.level,
    name: region.name,
  };
}

export function suffixAlias(name: string) {
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
