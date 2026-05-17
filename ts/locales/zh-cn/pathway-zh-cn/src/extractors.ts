import {
  TextTrie,
  createField,
  type ParseField,
  type ParseSpan,
} from "@pathway/core";
import { normalizeZhText } from "./normalizer";

export type EntityCandidate = ParseField & {
  kind: "phone" | "id_card" | "postal_code" | "name";
};

const labelWords = [
  "收货人",
  "收件人",
  "收件",
  "联系人",
  "联系电话",
  "联系人手机号码",
  "手机号码",
  "手机号",
  "手机",
  "电话",
  "姓名",
  "收货地址",
  "收件地址",
  "所在地区",
  "所在地",
  "联系地址",
  "送货地址",
  "详细地址",
  "省市区",
  "详细",
  "地区",
  "地址",
  "身份证号码",
  "身份证号",
  "身份证",
  "证件",
  "证件号码",
  "证件号",
  "证号",
  "邮政编码",
  "邮编",
];

const knownSurnames = new Set([
  "赵", "钱", "孙", "李", "周", "吴", "郑", "王", "冯", "陈", "卫", "蒋", "沈", "韩", "杨",
  "朱", "秦", "尤", "许", "何", "吕", "施", "张", "孔", "曹", "严", "华", "金", "魏", "陶",
  "姜", "谢", "邹", "喻", "柏", "章", "苏", "潘", "葛", "范", "彭", "郎", "鲁", "韦", "马", "刘",
  "苗", "方", "俞", "任", "袁", "柳", "鲍", "史", "唐", "费", "薛", "雷", "贺", "倪", "汤",
  "罗", "毕", "郝", "邬", "安", "常", "乐", "于", "时", "傅", "皮", "齐", "康", "伍", "余",
  "卜", "顾", "孟", "黄", "萧", "尹", "姚", "邵", "汪", "祁", "毛", "米", "贝", "明", "臧",
  "成", "戴", "谈", "宋", "庞", "熊", "纪", "舒", "项", "董", "梁", "杜", "阮", "蓝", "季",
  "麻", "强", "贾", "江", "童", "颜", "郭", "梅", "盛", "林", "徐", "高", "夏", "蔡", "田",
  "樊", "胡", "凌", "万", "柯", "卢", "莫", "房", "解", "丁", "邓", "洪", "左", "石", "崔",
  "龚", "程", "邢", "陆", "翁", "钟", "曾", "赖", "卓", "叶", "欧", "游", "司马", "上官", "欧阳",
  "诸葛", "东方", "皇甫", "尉迟", "公孙", "轩辕", "令狐", "宇文", "长孙", "慕容", "司徒", "司空",
]);

const nameSuffixBlockList = ["省", "市", "区", "县", "镇", "街道", "村", "地区", "地址", "电话", "收"];

export function findLabelSpans(input: string): ParseSpan[] {
  const trie = new TextTrie<string>();
  for (const label of labelWords) {
    trie.insert(normalizeZhText(label), label);
  }
  return trie.matchAll(input).map((match) => ({
    end: consumeLabelSeparator(input, match.end),
    raw: input.slice(match.start, consumeLabelSeparator(input, match.end)),
    start: match.start,
  }));
}

function consumeLabelSeparator(input: string, start: number) {
  let end = start;
  while (end < input.length && /[\s:：=,，;；|｜\-\]\[【】()（）{}<>]/.test(input[end])) {
    end += 1;
  }
  return end;
}

export function extractEntities(input: string, nameMaxLength: number, labelSpans: ParseSpan[]): EntityCandidate[] {
  const entities: EntityCandidate[] = [];
  const idCard = firstValidIdCard(input);
  if (idCard) {
    entities.push({ ...createField(idCard.raw.toUpperCase(), 0.99, "extractor", idCard), kind: "id_card" });
  }
  const phone = firstPhone(input, entitySpans(entities));
  if (phone) {
    entities.push({ ...createField(phone.raw.replace(/[^\d]/g, ""), 0.96, "extractor", phone), kind: "phone" });
  }
  const postalCode = firstPostalCode(input, entitySpans(entities));
  if (postalCode) {
    entities.push({ ...createField(postalCode.raw, 0.84, "extractor", postalCode), kind: "postal_code" });
  }
  const name = firstName(input, [...labelSpans, ...entitySpans(entities)], nameMaxLength);
  if (name) {
    entities.push({ ...createField(name.raw, 0.76, "heuristic", name), kind: "name" });
  }
  return entities;
}

function entitySpans(entities: EntityCandidate[]) {
  return entities.map((entity) => entity.span).filter(Boolean) as ParseSpan[];
}

function firstValidIdCard(input: string): ParseSpan | null {
  const pattern = /[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]/g;
  for (const match of input.matchAll(pattern)) {
    if (match.index === undefined) {
      continue;
    }
    const raw = match[0];
    if (isValidIdCard(raw)) {
      return { end: match.index + raw.length, raw, start: match.index };
    }
  }
  return null;
}

export function findInvalidIdCard(input: string, entities: EntityCandidate[]) {
  const hasValidId = entities.some((entity) => entity.kind === "id_card");
  if (hasValidId) {
    return false;
  }
  return /[1-9]\d{16}[0-9Xx]/.test(input);
}

function isValidIdCard(value: string) {
  const code = value.toUpperCase();
  const regionCodes = new Set([
    "11", "12", "13", "14", "15", "21", "22", "23", "31", "32", "33", "34", "35", "36", "37",
    "41", "42", "43", "44", "45", "46", "50", "51", "52", "53", "54", "61", "62", "63", "64",
    "65", "71", "81", "82", "91",
  ]);
  if (!regionCodes.has(code.slice(0, 2))) {
    return false;
  }
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const parity = ["1", "0", "X", "9", "8", "7", "6", "5", "4", "3", "2"];
  const sum = weights.reduce((total, weight, index) => total + Number(code[index]) * weight, 0);
  return parity[sum % 11] === code[17];
}

function firstPhone(input: string, excludes: ParseSpan[]) {
  const pattern = /((?:\+?86[- ]?)?1[3-9]\d[- ]?\d{4}[- ]?\d{4})|(?:0\d{2,3}[- ]?\d{7,8}(?:[- ]?\d{1,6})?)/g;
  for (const match of input.matchAll(pattern)) {
    if (match.index === undefined || overlapsAny(match.index, match.index + match[0].length, excludes)) {
      continue;
    }
    return { end: match.index + match[0].length, raw: match[0], start: match.index };
  }
  return null;
}

function firstPostalCode(input: string, excludes: ParseSpan[]) {
  const pattern = /(?<!\d)\d{6}(?!\d)/g;
  for (const match of input.matchAll(pattern)) {
    if (match.index === undefined || overlapsAny(match.index, match.index + match[0].length, excludes)) {
      continue;
    }
    return { end: match.index + match[0].length, raw: match[0], start: match.index };
  }
  return null;
}

function firstName(input: string, excludes: ParseSpan[], maxLength: number) {
  const labelPatterns = [
    /<\s*(?:name|recipient|receiver)\s*>\s*([\u4E00-\u9FA5]{2,6})\s*<\s*\/\s*(?:name|recipient|receiver)\s*>/gi,
    /(?:收货人|收件人|联系人|姓名|收件)\s*[\]】）)}〉>]*\s*[:：=|｜-]?\s*[\[【（({<]*\s*([\u4E00-\u9FA5]{2,6})/g,
    /(?:收货人|收件人|联系人|姓名|收件)\s*[（(]\s*([\u4E00-\u9FA5]{2,6})\s*[）)]/g,
  ];
  for (const pattern of labelPatterns) {
    const match = firstPatternName(input, pattern, excludes, maxLength);
    if (match) {
      return match;
    }
  }
  const suffix = /([\u4E00-\u9FA5]{2,6})收/.exec(input);
  if (suffix?.index !== undefined) {
    const value = suffix[1].slice(0, maxLength);
    const start = suffix.index + suffix[0].indexOf(suffix[1]);
    if (!overlapsAny(start, start + value.length, excludes) && looksLikeName(value)) {
      return { end: start + value.length, raw: value, start };
    }
  }
  const phoneAdjacent = firstPhoneAdjacentName(input, excludes, maxLength);
  if (phoneAdjacent) {
    return phoneAdjacent;
  }
  const spaced = /(?:^|\s)([\u4E00-\u9FA5]{2,4})(?=\s|$)/g;
  for (const match of input.matchAll(spaced)) {
    if (match.index === undefined) {
      continue;
    }
    const value = match[1].slice(0, maxLength);
    const start = match.index + match[0].lastIndexOf(match[1]);
    if (!overlapsAny(start, start + value.length, excludes) && looksLikeName(value)) {
      return { end: start + value.length, raw: value, start };
    }
  }
  const delimited = /(?:^|\t)([\u4E00-\u9FA5]{2,4})(?=\t)/g;
  for (const match of input.matchAll(delimited)) {
    if (match.index === undefined) {
      continue;
    }
    const value = match[1].slice(0, maxLength);
    const start = match.index + match[0].lastIndexOf(match[1]);
    if (!overlapsAny(start, start + value.length, excludes) && looksLikeName(value)) {
      return { end: start + value.length, raw: value, start };
    }
  }
  const pattern = /[\u4E00-\u9FA5]{2,6}/g;
  for (const match of input.matchAll(pattern)) {
    if (match.index === undefined || overlapsAny(match.index, match.index + match[0].length, excludes)) {
      continue;
    }
    const value = match[0].slice(0, maxLength);
    if (looksLikeName(value)) {
      return { end: match.index + value.length, raw: value, start: match.index };
    }
  }
  return null;
}

function firstPhoneAdjacentName(input: string, excludes: ParseSpan[], maxLength: number) {
  const phonePattern = /((?:\+?86[- ]?)?1[3-9]\d[- ]?\d{4}[- ]?\d{4})|(?:0\d{2,3}[- ]?\d{7,8}(?:[- ]?\d{1,6})?)/g;
  for (const match of input.matchAll(phonePattern)) {
    if (match.index === undefined) {
      continue;
    }
    const beforeText = input.slice(0, match.index);
    const before = /([\u4E00-\u9FA5]{2,4})[\s,，;；/|｜-]*$/.exec(beforeText);
    if (before?.index !== undefined) {
      const value = before[1].slice(0, maxLength);
      const start = before.index + before[0].indexOf(before[1]);
      if (!overlapsAny(start, start + value.length, excludes) && looksLikeName(value)) {
        return { end: start + value.length, raw: value, start };
      }
    }

    const after = /^[\s,，;；/|｜-]+([\u4E00-\u9FA5]{2,4})/.exec(input.slice(match.index + match[0].length));
    if (after) {
      const start = match.index + match[0].length + after[0].lastIndexOf(after[1]);
      const value = after[1].slice(0, maxLength);
      if (!overlapsAny(start, start + value.length, excludes) && looksLikeName(value)) {
        return { end: start + value.length, raw: value, start };
      }
    }
  }
  return null;
}

function firstPatternName(input: string, pattern: RegExp, excludes: ParseSpan[], maxLength: number) {
  for (const match of input.matchAll(pattern)) {
    if (match.index === undefined) {
      continue;
    }
    const rawValue = match[1];
    const value = rawValue.slice(0, maxLength);
    const start = match.index + match[0].lastIndexOf(rawValue);
    if (!overlapsAny(start, start + value.length, excludes) && looksLikeName(value)) {
      return { end: start + value.length, raw: value, start };
    }
  }
  return null;
}

function looksLikeName(value: string) {
  if (value.length < 2 || value.length > 4) {
    return false;
  }
  if (![...knownSurnames].some((surname) => value.startsWith(surname))) {
    return false;
  }
  return !nameSuffixBlockList.some((suffix) => value.endsWith(suffix));
}

function overlapsAny(start: number, end: number, spans: ParseSpan[]) {
  return spans.some((span) => start < span.end && end > span.start);
}
