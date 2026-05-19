import { createZhAddressParser, parseZhAddress } from "../src";
import {
  buildSyntheticIdCard,
  changeIdChecksum,
  createSyntheticCases,
  expectSyntheticCase,
} from "./test-utils";

const syntheticCases = createSyntheticCases();
const parser = createZhAddressParser();

test("generates a broad synthetic validation corpus", () => {
  expect(syntheticCases).toHaveLength(1036);
});

test.each(syntheticCases)("parses synthetic golden address %# - $note", ({ expected, input }) => {
  const result = parser.parse(input);

  expectSyntheticCase(result, expected);
  expect(result.confidence).toBeGreaterThanOrEqual(0.86);
});

test("test ID helper generates checksum-valid synthetic IDs", () => {
  const idCard = buildSyntheticIdCard("610113", "19940218", 128);
  const result = parseZhAddress(`收货人:秦星澜 手机:15826003333 地址:陕西省西安市雁塔区明理路39号 邮编:710061 身份证:${idCard}`);

  expect(result.idCard?.value).toBe(idCard);
  expect(result.warnings).not.toContain("id_card_invalid_checksum");
});

test("warns when an otherwise shaped ID has an invalid checksum", () => {
  const idCard = changeIdChecksum(buildSyntheticIdCard("370103", "19910109", 206));
  const result = parseZhAddress(`收货人:许初安 手机:17726004444 地址:山东省济南市市中区青禾路18号 邮编:250002 身份证:${idCard}`);

  expect(result.idCard).toBeUndefined();
  expect(result.warnings).toContain("id_card_invalid_checksum");
});

test("warns when a duplicate district name has multiple candidates", () => {
  const duplicateParser = createZhAddressParser({
    dataset: {
      regions: [
        {
          code: "P1",
          level: "province",
          name: "甲省",
          children: [
            {
              code: "C1",
              level: "city",
              name: "甲市",
              children: [{ code: "D1", level: "district", name: "新华区" }],
            },
          ],
        },
        {
          code: "P2",
          level: "province",
          name: "乙省",
          children: [
            {
              code: "C2",
              level: "city",
              name: "乙市",
              children: [{ code: "D2", level: "district", name: "新华区" }],
            },
          ],
        },
      ],
    },
  });
  const result = duplicateParser.parse("新华区星湖路26号 何予墨 18826005555");

  expect(result.region?.district?.name).toBe("新华区");
  expect(result.warnings).toContain("ambiguous_region");
});

test("warns when postal code conflicts with the resolved region", () => {
  const result = parseZhAddress("收货人:吕嘉禾 手机:19826006666 地址:陕西省西安市雁塔区云杉路55号 邮编:200120");

  expect(result.warnings).toContain("postal_code_region_conflict");
});

test("warns when ID card region conflicts with the resolved address region", () => {
  const idCard = buildSyntheticIdCard("310115", "19930214", 318);
  const result = parseZhAddress(`收货人:周以宁 手机:19926007777 地址:北京市朝阳区知春庭8号 邮编:100020 身份证:${idCard}`);

  expect(result.warnings).toContain("id_card_region_conflict");
});

test("parses one thousand generated cases under a generous scale threshold", () => {
  const corpus = Array.from({ length: 1000 }, (_, index) => syntheticCases[index % syntheticCases.length]);
  const startedAt = Date.now();

  for (const item of corpus) {
    const result = parser.parse(item.input);
    expect(result.region?.district?.name).toBe(item.expected.district);
  }

  expect(Date.now() - startedAt).toBeLessThan(10000);
});

test("parseZhAddress reuses the default parser for repeated calls", () => {
  const corpus = Array.from({ length: 100 }, (_, index) => syntheticCases[index % syntheticCases.length]);
  const startedAt = Date.now();

  for (const item of corpus) {
    const result = parseZhAddress(item.input, { idCardValidation: "shape", unrecognizedText: "separate" });
    expect(result.region?.district?.name).toBe(item.expected.district);
  }

  expect(Date.now() - startedAt).toBeLessThan(3000);
});
