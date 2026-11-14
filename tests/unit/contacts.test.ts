import { describe, expect, it } from "vitest";
import { maskContacts } from "@/lib/conduct";

describe("maskContacts", () => {
  const hidden = [
    "كلمني على 0551234567",
    "رقمي ٠٥٥١٢٣٤٥٦٧ واتس",
    "+966 55 123 4567",
    "966551234567",
    "055-123-4567",
    "ايميلي rayid.test@gmail.com",
    "wa.me/966551234567",
    "https://t.me/someone",
    "سناب: rayid_99",
    "instagram.com/mutqen_studio",
    "تابعني @mutqen_design",
  ];
  for (const t of hidden) {
    it(`hides: ${t}`, () => {
      const r = maskContacts(t);
      expect(r.hidden).toBe(true);
      expect(r.text).toContain("[مخفي]");
      expect(r.text).not.toMatch(/\d{7,}/);
    });
  }

  const kept = [
    "سلّمت 12 منشور + 4 ستوري",
    "السعر 1,500 ر.س والتسليم 2026-11-20",
    "عدّلت المنشور رقم 3 و 7",
    "الرابط في Google Drive مرفق بالتسليم",
  ];
  for (const t of kept) {
    it(`keeps: ${t}`, () => {
      expect(maskContacts(t)).toEqual({ text: t, hidden: false });
    });
  }
});
