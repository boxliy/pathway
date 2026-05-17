import {
  createDefaultZhCnRegionIndex,
  createDefaultZhCnRegions,
  type ZhCnRegionSourceNode,
} from "@pathway/zh-cn-data";
import type { RegionDataset, RegionNode } from "@pathway/core";
import type { RegionEvidenceProvider } from "./region-resolver";

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
