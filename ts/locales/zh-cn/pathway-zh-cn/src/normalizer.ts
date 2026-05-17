import { fullWidthToHalfWidth } from "@pathway/core";

const traditionalMap: Record<string, string> = {
  臺: "台",
  台灣: "台湾",
  張: "张",
  劉: "刘",
  節: "节",
  霽: "霁",
  機: "机",
  灣: "湾",
  華: "华",
  婺城區: "婺城区",
  關: "关",
  廣: "广",
  東: "东",
  門: "门",
  區: "区",
  縣: "县",
  鄉: "乡",
  鎮: "镇",
  街道辦: "街道办",
  聯: "联",
  聯系人: "联系人",
  聯絡人: "联系人",
  聯繫人: "联系人",
  電話: "电话",
  電: "电",
  號碼: "号码",
  號: "号",
  詳細: "详细",
  貨: "货",
  郵編: "邮编",
  郵政編碼: "邮政编码",
  證件: "证件",
  身份證: "身份证",
  收貨人: "收货人",
  收件地址: "收件地址",
};

export function normalizeZhText(input: string) {
  let output = fullWidthToHalfWidth(input)
    .replace(/\r|\n|\t/g, " ")
    .replace(/，|。|、|；|：|（|）|【|】|《|》|「|」|『|』/g, (char) => {
      const map: Record<string, string> = {
        "，": ",",
        "。": ".",
        "、": ",",
        "；": ";",
        "：": ":",
        "（": "(",
        "）": ")",
        "【": "[",
        "】": "]",
        "《": "<",
        "》": ">",
        "「": "\"",
        "」": "\"",
        "『": "\"",
        "』": "\"",
      };
      return map[char] ?? char;
    });
  const keys = Object.keys(traditionalMap).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    output = output.replace(new RegExp(key, "g"), traditionalMap[key]);
  }
  return output.replace(/\s+/g, " ").trim();
}
