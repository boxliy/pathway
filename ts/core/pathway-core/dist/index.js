"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  TextTrie: () => TextTrie,
  clampConfidence: () => clampConfidence,
  createField: () => createField,
  fullWidthToHalfWidth: () => fullWidthToHalfWidth,
  uniqueBy: () => uniqueBy
});
module.exports = __toCommonJS(index_exports);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  TextTrie,
  clampConfidence,
  createField,
  fullWidthToHalfWidth,
  uniqueBy
});
