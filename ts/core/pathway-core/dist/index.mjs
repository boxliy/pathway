// src/index.ts
var TextTrie = class {
  root = { children: /* @__PURE__ */ new Map(), entries: [] };
  insert(value, data) {
    if (!value) {
      return;
    }
    let node = this.root;
    for (const char of Array.from(value)) {
      let child = node.children.get(char);
      if (!child) {
        child = { children: /* @__PURE__ */ new Map(), entries: [] };
        node.children.set(char, child);
      }
      node = child;
    }
    node.entries.push({ data, value });
  }
  longestAt(input, start) {
    let node = this.root;
    let best = [];
    for (let offset = start; offset < input.length; offset += 1) {
      const child = node.children.get(input[offset]);
      if (!child) {
        break;
      }
      node = child;
      if (node.entries.length) {
        best = node.entries.map((entry) => ({
          data: entry.data,
          end: offset + 1,
          normalized: entry.value,
          raw: input.slice(start, offset + 1),
          start
        }));
      }
    }
    return best;
  }
  matchAll(input) {
    const matches = [];
    for (let index = 0; index < input.length; index += 1) {
      matches.push(...this.longestAt(input, index));
    }
    return matches;
  }
};
function clampConfidence(value) {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}
function createField(value, confidence, source, span) {
  return {
    confidence: clampConfidence(confidence),
    source,
    span,
    value
  };
}
function fullWidthToHalfWidth(input) {
  return input.replace(/\u3000/g, " ").replace(/[\uFF01-\uFF5E]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 65248));
}
function uniqueBy(items, key) {
  const seen = /* @__PURE__ */ new Set();
  const result = [];
  for (const item of items) {
    const value = key(item);
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.push(item);
  }
  return result;
}
export {
  TextTrie,
  clampConfidence,
  createField,
  fullWidthToHalfWidth,
  uniqueBy
};
