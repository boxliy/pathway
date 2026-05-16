import { createZhAddressParser, parseZhAddress, zhAddressInternals } from "./index";

test("normalizes full-width and traditional labels", () => {
  expect(zhAddressInternals.normalizeZhText("收貨人：張三，手機：１３８００００００００")).toBe("收货人:张三,手机:13800000000");
});

test("parses a complete simplified Chinese address", () => {
  const result = parseZhAddress("张娜，370213199208254024。青岛市李沧区临汾路海怡新城爱百客，15166000705。");

  expect(result.recipientName?.value).toBe("张娜");
  expect(result.idCard?.value).toBe("370213199208254024");
  expect(result.phone?.value).toBe("15166000705");
  expect(result.region?.province?.name).toBe("山东省");
  expect(result.region?.city?.name).toBe("青岛市");
  expect(result.region?.district?.name).toBe("李沧区");
  expect(result.addressLine?.value).toBe("临汾路海怡新城爱百客");
});

test("parses missing province and infers hierarchy from district", () => {
  const result = parseZhAddress("雁塔区高新四路710061 刘国良 13593464918");

  expect(result.region?.province?.name).toBe("陕西省");
  expect(result.region?.city?.name).toBe("西安市");
  expect(result.region?.district?.name).toBe("雁塔区");
  expect(result.postalCode?.value).toBe("710061");
  expect(result.recipientName?.value).toBe("刘国良");
  expect(result.addressLine?.value).toBe("高新四路");
});

test("parses street without treating a road name as another city", () => {
  const result = parseZhAddress("宁夏金凤区上海西路街道阅海万家A区23号楼1703号 李四 13800000000");

  expect(result.region?.province?.name).toBe("宁夏回族自治区");
  expect(result.region?.city?.name).toBe("银川市");
  expect(result.region?.district?.name).toBe("金凤区");
  expect(result.region?.street?.name).toBe("上海西路街道");
  expect(result.region?.city?.name).not.toBe("上海市");
  expect(result.addressLine?.value).toBe("阅海万家A区23号楼1703号");
});

test("parses tagged traditional Chinese input", () => {
  const result = parseZhAddress("收貨人:李節霽 | 手機:151-8023-1234 | 地址:浙江省金華市婺城區西關街道金磐路");

  expect(result.recipientName?.value).toBe("李节霁");
  expect(result.phone?.value).toBe("15180231234");
  expect(result.region?.province?.name).toBe("浙江省");
  expect(result.region?.city?.name).toBe("金华市");
  expect(result.region?.district?.name).toBe("婺城区");
  expect(result.region?.street?.name).toBe("西关街道");
  expect(result.addressLine?.value).toBe("金磐路");
});

test("does not accept an invalid identity card checksum", () => {
  const result = parseZhAddress("张三 370213199208254025 青岛市李沧区临汾路 15166000705");

  expect(result.idCard).toBeUndefined();
  expect(result.warnings).toContain("id_card_invalid_checksum");
});

test("supports caller supplied datasets", () => {
  const parser = createZhAddressParser({
    dataset: {
      regions: [
        {
          code: "P1",
          level: "province",
          name: "测试省",
          children: [
            {
              code: "C1",
              level: "city",
              name: "测试市",
              children: [
                {
                  code: "D1",
                  level: "district",
                  name: "测试区",
                  children: [
                    { code: "S1", level: "street", name: "测试街道" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  });

  const result = parser.parse("王五 测试省测试市测试区测试街道一号院 13900000000");

  expect(result.region?.street?.code).toBe("S1");
  expect(result.addressLine?.value).toBe("一号院");
});
