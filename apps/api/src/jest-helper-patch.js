/**
 * Custom Jest transformer wrapping ts-jest.
 *
 * TypeScript emits decorator metadata with `emitDecoratorMetadata: true` as:
 *
 *   tslib_1.__metadata("design:paramtypes", [
 *     typeof (_a = typeof Foo !== "undefined" && Foo) === "function" ? _a : Object,
 *     ...
 *   ])
 *   tslib_1.__metadata("design:returntype",
 *     typeof (_f = typeof Promise !== "undefined" && Promise) === "function" ? _f : Object
 *   )
 *
 * For large files TypeScript exhausts single letters and switches to numeric
 * suffixes (_0, _1 ... _18, ...).
 *
 * The `typeof (...) === "function" ? X : Object` ternary ALWAYS takes the
 * truthy branch in a correctly configured NestJS project; the `Object`
 * fallback is architecturally unreachable. Istanbul reports these as uncovered
 * branches mapped back to TypeScript source lines via source maps.
 *
 * This transformer prepends `/* istanbul ignore next * /` immediately before
 * every such ternary so Istanbul excludes it from branch coverage entirely.
 */
"use strict";

const { TsJestTransformer } = require("ts-jest");

const inner = new TsJestTransformer({});

// Matches the TypeScript-emitted type-safety guard:
//   typeof (_X = typeof Identifier !== "undefined" && Identifier)
// where _X is a single lower-case letter OR a numeric sequence (_0 ... _99).
const TYPE_GUARD_PATTERN =
  /typeof \(_[a-z0-9]+ = typeof [A-Za-z0-9_.]+/g;

module.exports = {
  process(sourceText, sourcePath, transformOptions) {
    const result = inner.process(sourceText, sourcePath, transformOptions);
    if (typeof result !== "object" || typeof result.code !== "string") {
      return result;
    }
    const patched = result.code.replace(
      TYPE_GUARD_PATTERN,
      (match) => `/* istanbul ignore next */ ${match}`,
    );
    return { ...result, code: patched };
  },
  getCacheKey(fileData, filePath, options) {
    if (typeof inner.getCacheKey === "function") {
      return inner.getCacheKey(fileData, filePath, options) + "-type-guard-patch-2";
    }
    return fileData + filePath + "-type-guard-patch-2";
  },
};
