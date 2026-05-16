import { parseZhAddress } from "./index";

const syntheticCases = [
  {
    input: "收货人：陈若宁 手机：138-2168-9021 身份证：110105199503082313 地址：北京市朝阳区朝外街道望京西园三区12号楼802 邮编：100020",
    expected: {
      addressLine: "朝外街道望京西园三区12号楼802",
      city: "北京市",
      district: "朝阳区",
      idCard: "110105199503082313",
      phone: "13821689021",
      postalCode: "100020",
      province: "北京市",
      recipientName: "陈若宁",
    },
  },
  {
    input: "18966541230 陕西省西安市雁塔区丈八沟街道锦业一路云栖中心B座1506 林亦航 710065",
    expected: {
      addressLine: "锦业一路云栖中心B座1506",
      city: "西安市",
      district: "雁塔区",
      phone: "18966541230",
      postalCode: "710065",
      province: "陕西省",
      recipientName: "林亦航",
      street: "丈八沟街道",
    },
  },
  {
    input: "联系人:周以晴,电话:021-61234567,上海市浦东新区张江镇晨晖路88弄5号203室,证件号310115198812176423",
    expected: {
      addressLine: "张江镇晨晖路88弄5号203室",
      city: "上海市",
      district: "浦东新区",
      idCard: "310115198812176423",
      phone: "02161234567",
      province: "上海市",
      recipientName: "周以晴",
    },
  },
  {
    input: "广东深圳龙华区观澜街道新澜大街19号A栋4层 许知远 13677889012",
    expected: {
      addressLine: "新澜大街19号A栋4层",
      city: "深圳市",
      district: "龙华区",
      phone: "13677889012",
      province: "广东省",
      recipientName: "许知远",
      street: "观澜街道",
    },
  },
  {
    input: "浙江省金華市婺城區西關街道金磐路66號 收貨人:李書言 手機:151-8023-1234",
    expected: {
      addressLine: "金磐路66号",
      city: "金华市",
      district: "婺城区",
      phone: "15180231234",
      province: "浙江省",
      recipientName: "李書言",
      street: "西关街道",
    },
  },
  {
    input: "福建福清市石竹街道清荣大道创意园3号楼 季安 15960441234 350181199604096379",
    expected: {
      addressLine: "石竹街道清荣大道创意园3号楼",
      city: "福州市",
      district: "福清市",
      idCard: "350181199604096379",
      phone: "15960441234",
      province: "福建省",
      recipientName: "季安",
    },
  },
  {
    input: "重庆市永川区南大街街道星湖路9号7栋2单元1802 唐沐 17783214566",
    expected: {
      addressLine: "南大街街道星湖路9号7栋2单元1802",
      city: "重庆市",
      district: "永川区",
      phone: "17783214566",
      province: "重庆市",
      recipientName: "唐沐",
    },
  },
  {
    input: "广西桂林市恭城瑶族自治县恭城镇茶南路16号 莫清予 18277345601 542500",
    expected: {
      addressLine: "恭城镇茶南路16号",
      city: "桂林市",
      district: "恭城瑶族自治县",
      phone: "18277345601",
      postalCode: "542500",
      province: "广西壮族自治区",
      recipientName: "莫清予",
    },
  },
];

test.each(syntheticCases)("parses synthetic golden address %#", ({ expected, input }) => {
  const result = parseZhAddress(input);

  expect(result.recipientName?.value).toBe(expected.recipientName);
  expect(result.phone?.value).toBe(expected.phone);
  expect(result.idCard?.value).toBe(expected.idCard);
  expect(result.postalCode?.value).toBe(expected.postalCode);
  expect(result.region?.province?.name).toBe(expected.province);
  expect(result.region?.city?.name).toBe(expected.city);
  expect(result.region?.district?.name).toBe(expected.district);
  expect(result.region?.street?.name).toBe(expected.street);
  expect(result.addressLine?.value).toBe(expected.addressLine);
  expect(result.confidence).toBeGreaterThanOrEqual(0.9);
});
