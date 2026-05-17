import { createDefaultZhCnRegionIndex, normalizeRegionName } from "../src";

test("keeps duplicate district names ambiguous", () => {
  const index = createDefaultZhCnRegionIndex();

  const matches = index.lookupAmbiguousName("朝阳区");

  expect(matches.map((region) => region.code)).toEqual(expect.arrayContaining(["110105", "220104"]));
  expect(matches.filter((region) => region.level === "district").map((region) => region.code)).toEqual(["110105", "220104"]);
});

test("resolves postal evidence in both directions", () => {
  const index = createDefaultZhCnRegionIndex();

  expect(index.lookupPostalCode("710061").map((candidate) => candidate.region.code)).toContain("610113");
  expect(index.lookupDistrictPostalCodes("610113").map((candidate) => candidate.postalCode)).toEqual(expect.arrayContaining(["710061", "710065"]));
});

test("resolves id address code evidence to districts", () => {
  const index = createDefaultZhCnRegionIndex();

  const candidate = index.lookupIdAddressCode("370213");

  expect(candidate?.region.name).toBe("李沧区");
  expect(candidate?.hierarchy.province?.name).toBe("山东省");
  expect(candidate?.hierarchy.city?.name).toBe("青岛市");
});

test("provides code and hierarchy lookups", () => {
  const index = createDefaultZhCnRegionIndex();

  const district = index.lookupByCode("610113");
  const street = index.lookupByCode("610113007");
  const hierarchy = index.lookupHierarchy("610113007");

  expect(district?.name).toBe("雁塔区");
  expect(street?.parentCode).toBe("610113");
  expect(index.lookupChildren("610113").map((region) => region.code)).toContain("610113007");
  expect(hierarchy?.province?.name).toBe("陕西省");
  expect(hierarchy?.city?.name).toBe("西安市");
  expect(hierarchy?.district?.name).toBe("雁塔区");
  expect(hierarchy?.street?.name).toBe("丈八沟街道");
});

test("normalizes names and aliases for lookup", () => {
  const index = createDefaultZhCnRegionIndex();

  expect(normalizeRegionName("陝西省")).toBe("陕西省");
  expect(index.lookupByName("陕西").map((region) => region.code)).toContain("61");
  expect(index.lookupByName("丈八沟").map((region) => region.code)).toContain("610113007");
});

test("indexes province-level short aliases", () => {
  const index = createDefaultZhCnRegionIndex();
  const cases = [
    ["京", "11"],
    ["津", "12"],
    ["冀", "13"],
    ["晋", "14"],
    ["蒙", "15"],
    ["辽", "21"],
    ["吉", "22"],
    ["黑", "23"],
    ["沪", "31"],
    ["苏", "32"],
    ["浙", "33"],
    ["皖", "34"],
    ["闽", "35"],
    ["赣", "36"],
    ["鲁", "37"],
    ["豫", "41"],
    ["鄂", "42"],
    ["湘", "43"],
    ["粤", "44"],
    ["桂", "45"],
    ["琼", "46"],
    ["渝", "50"],
    ["川", "51"],
    ["蜀", "51"],
    ["黔", "52"],
    ["贵", "52"],
    ["滇", "53"],
    ["云", "53"],
    ["藏", "54"],
    ["陕", "61"],
    ["秦", "61"],
    ["甘", "62"],
    ["陇", "62"],
    ["青", "63"],
    ["宁", "64"],
    ["新", "65"],
  ];

  for (const [alias, code] of cases) {
    expect(index.lookupByName(alias).map((region) => region.code)).toContain(code);
  }
});
