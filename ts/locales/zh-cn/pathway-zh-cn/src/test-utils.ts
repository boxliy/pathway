import type { ParseResult } from "@pathway/core";

export type SyntheticCase = {
  expected: {
    addressLine: string;
    city: string;
    district: string;
    idCard?: string;
    phone: string;
    postalCode?: string;
    province: string;
    recipientName: string;
    street?: string;
  };
  input: string;
  note: string;
};

type RegionSeed = {
  city: string;
  district: string;
  districtCode: string;
  province: string;
  postalCode: string;
  shortRegion?: string;
  street?: string;
};

const idWeights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
const idParity = ["1", "0", "X", "9", "8", "7", "6", "5", "4", "3", "2"];

const names = [
  "赵念辰",
  "钱思予",
  "孙明栩",
  "李若岚",
  "周以宁",
  "吴景和",
  "郑清越",
  "王知衡",
  "冯云舒",
  "陈晏宁",
  "卫南乔",
  "蒋书言",
  "沈知微",
  "韩亦然",
  "杨沐晨",
  "朱临溪",
  "秦星澜",
  "许初安",
  "何予墨",
  "吕嘉禾",
];

const buildingNames = [
  "晴川里",
  "澄园",
  "松澜中心",
  "云栖苑",
  "听竹轩",
  "星河湾",
  "远山府",
  "锦云阁",
  "和风里",
  "知春庭",
  "棠悦府",
  "南庭雅苑",
];

const roadNames = [
  "明理路",
  "青禾路",
  "春晓街",
  "云杉路",
  "锦年巷",
  "星湖路",
  "松风路",
  "听雨街",
  "棠溪路",
  "嘉宁路",
  "南浦路",
  "北辰路",
];

const regionSeeds: RegionSeed[] = [
  { city: "北京市", district: "朝阳区", districtCode: "110105", postalCode: "100020", province: "北京市" },
  { city: "上海市", district: "浦东新区", districtCode: "310115", postalCode: "200120", province: "上海市" },
  { city: "天津市", district: "南开区", districtCode: "120104", postalCode: "300100", province: "天津市" },
  { city: "重庆市", district: "永川区", districtCode: "500118", postalCode: "402160", province: "重庆市" },
  { city: "西安市", district: "雁塔区", districtCode: "610113", postalCode: "710061", province: "陕西省", street: "丈八沟街道" },
  { city: "银川市", district: "金凤区", districtCode: "640106", postalCode: "750002", province: "宁夏回族自治区", shortRegion: "宁夏银川市金凤区", street: "上海西路街道" },
  { city: "金华市", district: "婺城区", districtCode: "330702", postalCode: "321000", province: "浙江省", street: "西关街道" },
  { city: "深圳市", district: "龙华区", districtCode: "440309", postalCode: "518110", province: "广东省", street: "观澜街道" },
  { city: "呼和浩特市", district: "赛罕区", districtCode: "150105", postalCode: "010020", province: "内蒙古自治区", shortRegion: "内蒙古呼和浩特市赛罕区" },
  { city: "南宁市", district: "青秀区", districtCode: "450103", postalCode: "530022", province: "广西壮族自治区", shortRegion: "广西南宁市青秀区" },
  { city: "乌鲁木齐市", district: "天山区", districtCode: "650102", postalCode: "830002", province: "新疆维吾尔自治区", shortRegion: "新疆乌鲁木齐市天山区" },
  { city: "拉萨市", district: "城关区", districtCode: "540102", postalCode: "850000", province: "西藏自治区", shortRegion: "西藏拉萨市城关区" },
  { city: "济南市", district: "市中区", districtCode: "370103", postalCode: "250002", province: "山东省" },
  { city: "南京市", district: "玄武区", districtCode: "320102", postalCode: "210018", province: "江苏省" },
];

export function buildSyntheticIdCard(districtCode: string, date: string, sequence: string | number) {
  const normalizedSequence = String(sequence).padStart(3, "0");
  if (!/^\d{6}$/.test(districtCode)) {
    throw new Error("districtCode must be six digits");
  }
  if (!/^\d{8}$/.test(date)) {
    throw new Error("date must be YYYYMMDD");
  }
  if (!/^\d{3}$/.test(normalizedSequence)) {
    throw new Error("sequence must fit three digits");
  }
  const body = `${districtCode}${date}${normalizedSequence}`;
  const sum = idWeights.reduce((total, weight, index) => total + Number(body[index]) * weight, 0);
  return `${body}${idParity[sum % 11]}`;
}

export function changeIdChecksum(idCard: string) {
  const current = idCard.at(-1)?.toUpperCase();
  const replacement = current === "0" ? "1" : "0";
  return `${idCard.slice(0, -1)}${replacement}`;
}

export function expectSyntheticCase(result: ParseResult, expected: SyntheticCase["expected"]) {
  expect(result.recipientName?.value).toBe(expected.recipientName);
  expect(result.phone?.value).toBe(expected.phone);
  expect(result.idCard?.value).toBe(expected.idCard);
  expect(result.postalCode?.value).toBe(expected.postalCode);
  expect(result.region?.province?.name).toBe(expected.province);
  expect(result.region?.city?.name).toBe(expected.city);
  expect(result.region?.district?.name).toBe(expected.district);
  if (expected.street) {
    expect(result.region?.street?.name).toBe(expected.street);
  }
  expect(result.addressLine?.value).toContain(expected.addressLine);
}

export function createSyntheticCases() {
  const cases: SyntheticCase[] = [];
  for (let seedIndex = 0; seedIndex < regionSeeds.length; seedIndex += 1) {
    const seed = regionSeeds[seedIndex];
    for (let variant = 0; variant < 8; variant += 1) {
      cases.push(createSyntheticCase(seed, seedIndex, variant));
    }
  }
  return cases;
}

function createSyntheticCase(seed: RegionSeed, seedIndex: number, variant: number): SyntheticCase {
  const serial = seedIndex * 8 + variant;
  const name = names[serial % names.length];
  const phone = mobileFor(serial);
  const idCard = variant === 0 || variant === 3
    ? buildSyntheticIdCard(seed.districtCode, birthDateFor(serial), 100 + serial)
    : undefined;
  const regionText = regionTextFor(seed, variant);
  const expectedAddressLine = addressLineFor(seed, serial, variant);
  const inputAddressLine = inputAddressLineFor(seed, expectedAddressLine, variant);
  const expected = {
    addressLine: expectedAddressLine,
    city: seed.city,
    district: seed.district,
    idCard,
    phone,
    postalCode: [0, 1, 4, 5, 7].includes(variant) ? seed.postalCode : undefined,
    province: seed.province,
    recipientName: name,
    street: variant === 1 ? seed.street : undefined,
  };
  return {
    expected,
    input: inputForVariant({
      expected,
      idCard,
      inputAddressLine,
      name,
      phone,
      regionText,
      seed,
      variant,
    }),
    note: `${seed.province}${seed.city}${seed.district} variant ${variant}`,
  };
}

function inputForVariant(params: {
  expected: SyntheticCase["expected"];
  idCard?: string;
  inputAddressLine: string;
  name: string;
  phone: string;
  regionText: string;
  seed: RegionSeed;
  variant: number;
}) {
  const { expected, idCard, inputAddressLine, name, phone, regionText, seed, variant } = params;
  switch (variant) {
    case 0:
      return `收货人:${name} 手机:${formatMobile(phone, "-")} 身份证:${idCard} 地址:${regionText}${inputAddressLine} 邮编:${expected.postalCode}`;
    case 1:
      return `${name} ${formatMobile(phone, " ")} ${regionText}${seed.street ?? ""}${inputAddressLine} ${expected.postalCode}`;
    case 2:
      return `联系人=${name};联系电话=${phone};所在地=${regionText};详细地址=${inputAddressLine}`;
    case 3:
      return `${name}${phone}${regionText}${inputAddressLine}${idCard}`;
    case 4:
      return `收件人|${name}|电话|${formatMobile(phone, "-")}|送货地址|${regionText}${inputAddressLine}|邮政编码|${expected.postalCode}`;
    case 5:
      return `姓名:${name},手机号码:${phone},地址:${regionText}${inputAddressLine},邮编:${expected.postalCode}`;
    case 6:
      return `收貨人:${traditionalName(name)} 手機:${formatMobile(phone, "-")} 收件地址:${traditionalRegion(regionText)}${traditionalAddress(inputAddressLine)}`;
    default:
      return `联系人 ${name} 电话 ${phone} ${regionText}${inputAddressLine} ${expected.postalCode}`;
  }
}

function regionTextFor(seed: RegionSeed, variant: number) {
  if (variant === 2 && seed.shortRegion) {
    return seed.shortRegion;
  }
  if (variant === 3) {
    return `${seed.city}${seed.district}`;
  }
  return `${seed.province}${seed.city}${seed.district}`;
}

function addressLineFor(seed: RegionSeed, serial: number, variant: number) {
  const road = variant === 7 && seed.street === "上海西路街道" ? "北京路" : roadNames[serial % roadNames.length];
  const building = buildingNames[(serial + variant) % buildingNames.length];
  return `${road}${20 + serial}号${building}${(serial % 9) + 1}栋${(variant % 5) + 1}单元${601 + serial}室`;
}

function inputAddressLineFor(seed: RegionSeed, addressLine: string, variant: number) {
  if (variant === 1 && seed.street) {
    return addressLine;
  }
  return addressLine;
}

function mobileFor(index: number) {
  const prefixes = ["138", "139", "150", "151", "152", "157", "158", "159", "177", "178", "182", "183", "187", "188", "198", "199"];
  const prefix = prefixes[index % prefixes.length];
  return `${prefix}${String(26000000 + index * 7919).slice(0, 8)}`;
}

function birthDateFor(index: number) {
  const year = 1980 + (index % 24);
  const month = String((index % 12) + 1).padStart(2, "0");
  const day = String((index % 27) + 1).padStart(2, "0");
  return `${year}${month}${day}`;
}

function formatMobile(phone: string, separator: "-" | " ") {
  return `${phone.slice(0, 3)}${separator}${phone.slice(3, 7)}${separator}${phone.slice(7)}`;
}

function traditionalName(name: string) {
  return name;
}

function traditionalRegion(value: string) {
  return value
    .replace(/华/g, "華")
    .replace(/区/g, "區")
    .replace(/县/g, "縣")
    .replace(/镇/g, "鎮")
    .replace(/街道/g, "街道辦");
}

function traditionalAddress(value: string) {
  return value
    .replace(/号/g, "號")
    .replace(/区/g, "區")
    .replace(/东/g, "東")
    .replace(/门/g, "門");
}
