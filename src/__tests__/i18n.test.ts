import { describe, it, expect } from "vitest";
import cs from "../../messages/cs.json";
import en from "../../messages/en.json";
import itJson from "../../messages/it.json";

function getKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      return getKeys(value as Record<string, unknown>, fullKey);
    }
    return [fullKey];
  });
}

describe("i18n translation files", () => {
  const csKeys = getKeys(cs).sort();
  const enKeys = getKeys(en).sort();
  const itKeys = getKeys(itJson).sort();

  it("cs.json and en.json have the same keys", () => {
    const missingInEn = csKeys.filter((k) => !enKeys.includes(k));
    const extraInEn = enKeys.filter((k) => !csKeys.includes(k));
    expect(missingInEn, "Keys in cs.json missing from en.json").toEqual([]);
    expect(extraInEn, "Keys in en.json missing from cs.json").toEqual([]);
  });

  it("cs.json and it.json have the same keys", () => {
    const missingInIt = csKeys.filter((k) => !itKeys.includes(k));
    const extraInIt = itKeys.filter((k) => !csKeys.includes(k));
    expect(missingInIt, "Keys in cs.json missing from it.json").toEqual([]);
    expect(extraInIt, "Keys in it.json missing from cs.json").toEqual([]);
  });

  it("no translation value is empty string", () => {
    const checkEmpty = (keys: string[], obj: Record<string, unknown>, lang: string) => {
      const emptyKeys = keys.filter((key) => {
        const parts = key.split(".");
        let val: unknown = obj;
        for (const p of parts) val = (val as Record<string, unknown>)[p];
        return val === "";
      });
      expect(emptyKeys, `Empty values in ${lang}.json`).toEqual([]);
    };
    checkEmpty(csKeys, cs, "cs");
    checkEmpty(enKeys, en, "en");
    checkEmpty(itKeys, itJson, "it");
  });
});
