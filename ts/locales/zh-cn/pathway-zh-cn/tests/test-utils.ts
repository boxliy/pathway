import type { ParseResult } from "@pathway/core";
import { preferredZhCnRegionShortAlias, removeZhCnRegionSuffix } from "@pathway/zh-cn-data";

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
  "孔令宸",
  "曹映然",
  "严知夏",
  "华景初",
  "金若衡",
  "魏南星",
  "陶亦澄",
  "姜晚晴",
  "谢云舟",
  "邹予安",
  "喻清禾",
  "柏书宁",
  "章星语",
  "苏见微",
  "潘南栀",
  "葛庭川",
  "范明舒",
  "彭以默",
  "郎书白",
  "鲁星晚",
  "韦知遥",
  "马临风",
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
  "映月府",
  "栖云台",
  "望舒里",
  "青棠苑",
  "朗庭中心",
  "清越居",
  "云麓湾",
  "星澜府",
  "锦书阁",
  "见山里",
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
  "望云路",
  "清晖街",
  "星澜大道",
  "知行路",
  "映雪巷",
  "云锦路",
  "长风街",
  "南山路",
  "锦和路",
  "澄江路",
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
  { city: "石家庄市", district: "长安区", districtCode: "130102", postalCode: "050011", province: "河北省" },
  { city: "太原市", district: "小店区", districtCode: "140105", postalCode: "030032", province: "山西省" },
  { city: "沈阳市", district: "和平区", districtCode: "210102", postalCode: "110001", province: "辽宁省" },
  { city: "长春市", district: "南关区", districtCode: "220102", postalCode: "130022", province: "吉林省" },
  { city: "哈尔滨市", district: "道里区", districtCode: "230102", postalCode: "150010", province: "黑龙江省", shortRegion: "黑龙江哈尔滨市道里区" },
  { city: "合肥市", district: "庐阳区", districtCode: "340103", postalCode: "230001", province: "安徽省" },
  { city: "福州市", district: "鼓楼区", districtCode: "350102", postalCode: "350001", province: "福建省" },
  { city: "南昌市", district: "东湖区", districtCode: "360102", postalCode: "330006", province: "江西省" },
  { city: "郑州市", district: "金水区", districtCode: "410105", postalCode: "450003", province: "河南省" },
  { city: "武汉市", district: "武昌区", districtCode: "420106", postalCode: "430061", province: "湖北省" },
  { city: "长沙市", district: "岳麓区", districtCode: "430104", postalCode: "410006", province: "湖南省" },
  { city: "海口市", district: "美兰区", districtCode: "460108", postalCode: "570203", province: "海南省" },
  { city: "成都市", district: "武侯区", districtCode: "510107", postalCode: "610041", province: "四川省" },
  { city: "贵阳市", district: "南明区", districtCode: "520102", postalCode: "550002", province: "贵州省" },
  { city: "昆明市", district: "五华区", districtCode: "530102", postalCode: "650032", province: "云南省" },
  { city: "兰州市", district: "城关区", districtCode: "620102", postalCode: "730030", province: "甘肃省" },
  { city: "西宁市", district: "城中区", districtCode: "630103", postalCode: "810000", province: "青海省" },
  { city: "广州市", district: "天河区", districtCode: "440106", postalCode: "510630", province: "广东省" },
  { city: "苏州市", district: "姑苏区", districtCode: "320508", postalCode: "215008", province: "江苏省" },
  { city: "杭州市", district: "西湖区", districtCode: "330106", postalCode: "310013", province: "浙江省" },
  { city: "青岛市", district: "市南区", districtCode: "370202", postalCode: "266001", province: "山东省" },
  { city: "厦门市", district: "思明区", districtCode: "350203", postalCode: "361001", province: "福建省" },
  { city: "深圳市", district: "南山区", districtCode: "440305", postalCode: "518052", province: "广东省" },
];

const variantCount = 28;

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
    for (let variant = 0; variant < variantCount; variant += 1) {
      cases.push(createSyntheticCase(seed, seedIndex, variant));
    }
  }
  return cases;
}

function createSyntheticCase(seed: RegionSeed, seedIndex: number, variant: number): SyntheticCase {
  const serial = seedIndex * variantCount + variant;
  const name = names[serial % names.length];
  const phone = mobileFor(serial);
  const idCard = [0, 3, 8, 10, 12, 14, 16, 18, 24].includes(variant)
    ? buildSyntheticIdCard(seed.districtCode, birthDateFor(serial), 100 + (serial % 800))
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
    postalCode: [0, 1, 4, 5, 7, 8, 10, 11, 12, 13, 15, 17, 19, 23].includes(variant) ? seed.postalCode : undefined,
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
  const provinceShort = preferredZhCnRegionShortAlias(seed.province, "province");
  const cityShort = removeZhCnRegionSuffix(seed.city);
  const districtShort = removeZhCnRegionSuffix(seed.district);
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
    case 7:
      return `联系人 ${name} 电话 ${phone} ${regionText}${inputAddressLine} ${expected.postalCode}`;
    case 8:
      return `收货人 ${name}\n手机号码 ${formatMobile(phone, " ")}\n所在地区 ${regionText}\n详细地址 ${inputAddressLine}\n证件号 ${idCard}\n邮编 ${expected.postalCode}`;
    case 9:
      return `${regionText}${inputAddressLine}，${name}收，${formatMobile(phone, "-")}`;
    case 10:
      return `姓名：${name}；身份证号码：${idCard}；联系电话：${phone}；收货地址：${regionText}${inputAddressLine}；邮政编码：${expected.postalCode}`;
    case 11:
      return `收件人：${name}，手机：${phone}，省市区：${regionText}，地址：${inputAddressLine}，邮编：${expected.postalCode}`;
    case 12:
      return `[收货人]${name} [地址]${regionText}${inputAddressLine} [手机]${formatMobile(phone, "-")} [身份证]${idCard} [邮编]${expected.postalCode}`;
    case 13:
      return `【电话】${formatMobile(phone, " ")}【邮编】${expected.postalCode}【详细地址】${regionText}${inputAddressLine}【联系人】${name}`;
    case 14:
      return `{姓名:${name}} {证件:${idCard}} {手机:${phone}} {地区:${regionText}} {详细:${inputAddressLine}}`;
    case 15:
      return `地址(${regionText}${inputAddressLine}) 联系人(${name}) 手机(${formatMobile(phone, "-")}) 邮编(${expected.postalCode})`;
    case 16:
      return `寄到：${regionText}${inputAddressLine}；收件：${name}；证号：${idCard}；联系：${phone}`;
    case 17:
      return `${expected.postalCode}\t${formatMobile(phone, " ")}\t${name}\t${regionText}\t${inputAddressLine}`;
    case 18:
      return `<name>${name}</name><phone>${phone}</phone><id>${idCard}</id><addr>${regionText}${inputAddressLine}</addr>`;
    case 19:
      return `手机=${formatMobile(phone, "-")}；收货人=${name}；邮编=${expected.postalCode}；地址=${regionText}${inputAddressLine}`;
    case 20:
      return `${provinceShort}${cityShort}${districtShort}${inputAddressLine} ${name} ${phone}`;
    case 21:
      return `${provinceShort} ${cityShort} ${districtShort} ${inputAddressLine} ${formatMobile(phone, " ")} ${name}`;
    case 22:
      return `${cityShort}${districtShort}${inputAddressLine} ${name} ${formatMobile(phone, "-")}`;
    case 23:
      return `${districtShort}${inputAddressLine} ${name} ${phone} ${expected.postalCode}`;
    case 24:
      return `${provinceShort}/${cityShort}/${districtShort}/${inputAddressLine}/${name}/${phone}/${idCard}`;
    case 25:
      return `${provinceShort}-${cityShort}-${districtShort}-${inputAddressLine};${name};${formatMobile(phone, "-")}`;
    case 26:
      return `地区 ${provinceShort} ${cityShort}${districtShort} 地址 ${inputAddressLine} 联系 ${phone} 收件 ${name}`;
    default:
      return `${name} ${formatMobile(phone, " ")} ${provinceShort}${cityShort} ${districtShort}${inputAddressLine}`;
  }
}

function regionTextFor(seed: RegionSeed, variant: number) {
  if (variant === 2 && seed.shortRegion) {
    return seed.shortRegion;
  }
  if (variant === 3) {
    return `${seed.city}${seed.district}`;
  }
  if (variant === 9) {
    return seed.shortRegion ?? `${seed.city}${seed.district}`;
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
