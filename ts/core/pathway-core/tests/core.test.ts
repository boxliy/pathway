import { TextTrie, clampConfidence, fullWidthToHalfWidth } from "../src";

test("fullWidthToHalfWidth converts common full-width characters", () => {
  expect(fullWidthToHalfWidth("ＡＢＣ１２３　，")).toBe("ABC123 ,");
});

test("clampConfidence keeps scores in range", () => {
  expect(clampConfidence(-1)).toBe(0);
  expect(clampConfidence(0.42)).toBe(0.42);
  expect(clampConfidence(2)).toBe(1);
});

test("TextTrie returns longest matches at every position", () => {
  const trie = new TextTrie<{ code: string }>();
  trie.insert("上海", { code: "a" });
  trie.insert("上海西路", { code: "b" });

  const matches = trie.matchAll("宁夏上海西路");

  expect(matches).toEqual([
    {
      data: { code: "b" },
      end: 6,
      normalized: "上海西路",
      raw: "上海西路",
      start: 2,
    },
  ]);
});
