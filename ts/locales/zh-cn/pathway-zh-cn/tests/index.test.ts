import { createZhAddressParser, parseZhAddress, zhAddressInternals } from "../src";
import { buildSyntheticIdCard, changeIdChecksum } from "./test-utils";

test("normalizes full-width and traditional labels", () => {
  expect(zhAddressInternals.normalizeZhText("收貨人：張書言，手機：１９９２６００１２３４")).toBe("收货人:张書言,手机:19926001234");
});

test("parses a complete simplified Chinese address", () => {
  const idCard = buildSyntheticIdCard("370213", "19920825", 402);
  const result = parseZhAddress(`陈晏宁，${idCard}。青岛市李沧区青禾路澄园3号楼，15166000705。`);

  expect(result.recipientName?.value).toBe("陈晏宁");
  expect(result.idCard?.value).toBe(idCard);
  expect(result.phone?.value).toBe("15166000705");
  expect(result.region?.province?.name).toBe("山东省");
  expect(result.region?.city?.name).toBe("青岛市");
  expect(result.region?.district?.name).toBe("李沧区");
  expect(result.addressLine?.value).toBe("青禾路澄园3号楼");
});

test.each([
  {
    addressLine: "高新区华奥路567号德润天玺西区1-1-403",
    city: "济南市",
    input: "山东省济南市高新区华奥路567号德润天玺西区1-1-403",
    province: "山东省",
  },
  {
    addressLine: "经济开发区商英街56号悉尼阳光小区7号楼1单元1号",
    city: "郑州市",
    input: "河南省 郑州市 经济开发区 商英街56号悉尼阳光小区7号楼1单元1号",
    province: "河南省",
  },
  {
    addressLine: "经济开发区商英衔56号悉尼阳光小区7号楼1单元1号",
    city: "郑州市",
    input: "河南省 郑州市 经济开发区 商英衔56号悉尼阳光小区7号楼1单元1号",
    province: "河南省",
  },
])("keeps explicit province and city ahead of unrelated repeated street aliases: $input", ({addressLine, city, input, province}) => {
  const result = parseZhAddress(input);

  expect(result.region?.province?.name).toBe(province);
  expect(result.region?.city?.name).toBe(city);
  expect(result.addressLine?.value).toBe(addressLine);
  expect(result.displayAddressLine?.value).toBe(addressLine);
});

test("parses missing province and infers hierarchy from district", () => {
  const result = parseZhAddress("雁塔区明理路710061 秦星澜 13593464918");

  expect(result.region?.province?.name).toBe("陕西省");
  expect(result.region?.city?.name).toBe("西安市");
  expect(result.region?.district?.name).toBe("雁塔区");
  expect(result.postalCode?.value).toBe("710061");
  expect(result.recipientName?.value).toBe("秦星澜");
  expect(result.addressLine?.value).toBe("明理路");
});

test("parses street without treating a road name as another city", () => {
  const result = parseZhAddress("宁夏金凤区上海西路街道星河湾A区23号楼1703号 李若岚 19926001234");

  expect(result.region?.province?.name).toBe("宁夏回族自治区");
  expect(result.region?.city?.name).toBe("银川市");
  expect(result.region?.district?.name).toBe("金凤区");
  expect(result.region?.street?.name).toBe("上海西路街道");
  expect(result.region?.city?.name).not.toBe("上海市");
  expect(result.addressLine?.value).toBe("星河湾A区23号楼1703号");
});

test("does not infer recipient name from address-only text with phone", () => {
  const roadLikeName = parseZhAddress("北京市朝阳区安定路88号 13826001234");
  const placeLikeName = parseZhAddress("上海市长宁区程家桥路99号 13826002345");

  expect(roadLikeName.recipientName).toBeUndefined();
  expect(placeLikeName.recipientName).toBeUndefined();
});

test("parses province shorthand with suffixless city and district names", () => {
  const result = parseZhAddress("鲁青岛李沧青禾路澄园3号楼 陈晏宁 15166000705");

  expect(result.region?.province?.name).toBe("山东省");
  expect(result.region?.city?.name).toBe("青岛市");
  expect(result.region?.district?.name).toBe("李沧区");
  expect(result.addressLine?.value).toBe("青禾路澄园3号楼");
});

test("parses separated shorthand region components without required suffixes", () => {
  const result = parseZhAddress("粤 深圳 南山 科苑路15号A座 赵念辰 13826001234");

  expect(result.region?.province?.name).toBe("广东省");
  expect(result.region?.city?.name).toBe("深圳市");
  expect(result.region?.district?.name).toBe("南山区");
  expect(result.addressLine?.value).toBe("科苑路15号A座");
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
  const result = parseZhAddress(`赵念辰 ${changeIdChecksum(buildSyntheticIdCard("370213", "19920825", 402))} 青岛市李沧区青禾路 15166000705`);

  expect(result.idCard).toBeUndefined();
  expect(result.warnings).toContain("id_card_invalid_checksum");
});

test("can extract checksum-invalid identity cards in shape mode", () => {
  const result = parseZhAddress(
    "收件人:赵六 手机:15400000004 地址:江苏省南京市玄武区珠江路 88 号 身份证:320102199003078888",
    { idCardValidation: "shape", unrecognizedText: "separate" },
  );

  expect(result.recipientName?.value).toBe("赵六");
  expect(result.phone?.value).toBe("15400000004");
  expect(result.idCard?.value).toBe("320102199003078888");
  expect(result.region?.province?.name).toBe("江苏省");
  expect(result.region?.city?.name).toBe("南京市");
  expect(result.region?.district?.name).toBe("玄武区");
  expect(result.addressLine?.value).toBe("珠江路88号");
  expect(result.displayAddressLine?.value).toBe("珠江路88号");
  expect(result.warnings).toContain("id_card_invalid_checksum");
});

test("keeps labels and weak identity card values out of the address line", () => {
  const cases = [
    {
      addressLine: "临汾路28号",
      district: "李沧区",
      idCard: "370213199208254025",
      input: "李四/15200000002/370213199208254025/山东省青岛市李沧区临汾路 28 号",
      name: "李四",
      phone: "15200000002",
      province: "山东省",
    },
    {
      addressLine: "西关街道金磐路",
      district: "婺城区",
      idCard: "330702199503126666",
      input: "姓名 王五\t电话 15300000003\t浙江省金华市婺城区西关街道金磐路\t证件 330702199503126666",
      name: "王五",
      phone: "15300000003",
      province: "浙江省",
    },
  ];

  for (const item of cases) {
    const result = parseZhAddress(item.input, { idCardValidation: "shape", unrecognizedText: "separate" });

    expect(result.recipientName?.value).toBe(item.name);
    expect(result.phone?.value).toBe(item.phone);
    expect(result.idCard?.value).toBe(item.idCard);
    expect(result.region?.province?.name).toBe(item.province);
    expect(result.region?.district?.name).toBe(item.district);
    expect(result.displayAddressLine?.value).toBe(item.addressLine);
    expect(result.warnings).toContain("id_card_invalid_checksum");
  }
});

test("parses compact municipality addresses with province short aliases", () => {
  const result = parseZhAddress(
    "沪浦东南京东路235#26 周八 15600000006 310115199906186666",
    { idCardValidation: "shape", unrecognizedText: "separate" },
  );

  expect(result.region?.province?.name).toBe("上海市");
  expect(result.region?.city?.name).toBe("上海市");
  expect(result.region?.district?.name).toBe("浦东新区");
  expect(result.displayAddressLine?.value).toBe("南京东路235#26");
  expect(result.recipientName?.value).toBe("周八");
  expect(result.phone?.value).toBe("15600000006");
  expect(result.idCard?.value).toBe("310115199906186666");
});

test("keeps invalid checksum identity text out of display address in checksum mode", () => {
  const result = parseZhAddress(
    "张三 370213199208254025 青岛市李沧区临汾路 15166000705",
    { idCardValidation: "checksum", unrecognizedText: "separate" },
  );

  expect(result.idCard).toBeUndefined();
  expect(result.displayAddressLine?.value).toBe("临汾路");
  expect(result.warnings).toContain("id_card_invalid_checksum");
});

test("preserves punctuation in the address and display address lines", () => {
  const result = parseZhAddress("湖北省武汉市江岸区上海路109号(A座)/12-3-405");

  expect(result.addressLine?.value).toBe("上海路109号(A座)/12-3-405");
  expect(result.displayAddressLine?.value).toBe("上海路109号(A座)/12-3-405");
});

test("preserves address punctuation with a tagged contact and hyphenated phone", () => {
  const result = parseZhAddress(
    "联系人:张三 手机:151-8023-1234 地址:湖北省武汉市江岸区上海路109号(A座)/12-3-405",
  );

  expect(result.recipientName?.value).toBe("张三");
  expect(result.phone?.value).toBe("15180231234");
  expect(result.addressLine?.value).toBe("上海路109号(A座)/12-3-405");
  expect(result.displayAddressLine?.value).toBe("上海路109号(A座)/12-3-405");
});

test("extracts checksum-invalid identity card from comma separated address text in shape mode", () => {
  const result = parseZhAddress(
    "山东省青岛市李沧区临汾路 28 号，李四，15200000002，370213199208254025",
    { idCardValidation: "shape", unrecognizedText: "separate" },
  );

  expect(result.region?.province?.name).toBe("山东省");
  expect(result.region?.city?.name).toBe("青岛市");
  expect(result.region?.district?.name).toBe("李沧区");
  expect(result.displayAddressLine?.value).toBe("临汾路28号");
  expect(result.recipientName?.value).toBe("李四");
  expect(result.phone?.value).toBe("15200000002");
  expect(result.idCard?.value).toBe("370213199208254025");
  expect(result.warnings).toContain("id_card_invalid_checksum");
});

test("returns display address with street and separates remark text", () => {
  const result = parseZhAddress(
    "姓名 王五\t电话 15300000003\t浙江省金华市婺城区西关街道金磐路\t证件 330702199503126666 备注易碎",
    { idCardValidation: "shape", unrecognizedText: "separate" },
  );

  expect(result.region?.street?.name).toBe("西关街道");
  expect(result.addressLine?.value).toBe("金磐路备注易碎");
  expect(result.displayAddressLine?.value).toBe("西关街道金磐路");
  expect(result.unrecognizedText?.value).toBe("备注易碎");
});

test("removes separators at the boundary between display address and remark", () => {
  const labeledRemark = parseZhAddress(
    "浙江省金华市婺城区西关街道金磐路，备注：易碎",
    { unrecognizedText: "separate" },
  );
  const unlabeledRemark = parseZhAddress(
    "浙江省金华市婺城区西关街道金磐路，易碎",
    { unrecognizedText: "separate" },
  );

  expect(labeledRemark.displayAddressLine?.value).toBe("西关街道金磐路");
  expect(labeledRemark.unrecognizedText?.value).toBe("备注易碎");
  expect(unlabeledRemark.displayAddressLine?.value).toBe("西关街道金磐路");
  expect(unlabeledRemark.unrecognizedText?.value).toBe("备注易碎");
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

  const result = parser.parse("王知衡 测试省测试市测试区测试街道一号院 19926002345");

  expect(result.region?.street?.code).toBe("S1");
  expect(result.addressLine?.value).toBe("一号院");
});

test("uses identity card address code as region evidence when text has no region", () => {
  const idCard = buildSyntheticIdCard("370213", "19920825", 402);
  const result = parseZhAddress(`陈晏宁 ${idCard} 青禾路澄园3号楼 15166000705`);

  expect(result.region?.province?.name).toBe("山东省");
  expect(result.region?.city?.name).toBe("青岛市");
  expect(result.region?.district?.name).toBe("李沧区");
  expect(result.addressLine?.value).toBe("青禾路澄园3号楼");
  expect(result.evidence?.some((item) => item.source === "id_card" && item.target === "370213")).toBe(true);
});

test("uses data package postal evidence by default when text has no region", () => {
  const result = parseZhAddress("陈晏宁 青禾路澄园3号楼 15166000705 266100");

  expect(result.region?.province?.name).toBe("山东省");
  expect(result.region?.city?.name).toBe("青岛市");
  expect(result.region?.district?.name).toBe("李沧区");
  expect(result.evidence?.some((item) => item.source === "postal_code" && item.target === "370213")).toBe(true);
});

test("allows caller postal code regions to override default postal evidence", () => {
  const parser = createZhAddressParser({
    postalCodeRegions: {
      "100020": "310115",
    },
  });

  const result = parser.parse("陈晏宁 世纪大道88号 15166000705 100020");

  expect(result.region?.province?.name).toBe("上海市");
  expect(result.region?.city?.name).toBe("上海市");
  expect(result.region?.district?.name).toBe("浦东新区");
  expect(result.evidence?.some((item) => item.source === "postal_code" && item.target === "310115")).toBe(true);
  expect(result.evidence?.some((item) => item.source === "postal_code" && item.target === "110105")).toBe(false);
});

test("keeps duplicate region names as unresolved candidates", () => {
  const parser = createZhAddressParser({
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

  const result = parser.parse("新华区明理路1号 王知衡 19926003456");

  expect(result.region?.district?.name).toBe("新华区");
  expect(result.candidates?.regions?.map((candidate) => candidate.code)).toEqual(expect.arrayContaining(["D1", "D2"]));
  expect(result.warnings).toContain("ambiguous_region");
  expect(result.addressLine?.value).toBe("明理路1号");
});

test("returns parser evidence candidates and components without breaking legacy fields", () => {
  const result = parseZhAddress("宁夏金凤区上海西路街道星河湾A区23号楼1703号 李若岚 19926001234");

  expect(result.region?.province?.name).toBe("宁夏回族自治区");
  expect(result.components?.region?.district?.name).toBe("金凤区");
  expect(result.components?.addressLine?.value).toBe(result.addressLine?.value);
  expect(result.candidates?.regions?.some((candidate) => candidate.name === "上海市")).toBe(true);
  expect(result.region?.street?.name).toBe("上海西路街道");
});
