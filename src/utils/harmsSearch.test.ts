import { describe, expect, it } from "vitest";
import {
  ANIMAL_ONLY_HARMS_EXCLUSION,
  DEVICE_HARMS_EXPRESSION,
  DRUG_HARMS_BALANCED_EXPRESSION,
  DRUG_HARMS_SENSITIVE_EXPRESSION,
  GENERIC_HARMS_SENSITIVE_EXPRESSION,
  RARE_HARMS_SUPPLEMENT_EXPRESSION,
  SURGERY_HARMS_EXPRESSION,
  buildHarmsSearchQuery,
} from "./harmsSearch";

describe("buildHarmsSearchQuery", () => {
  it("requires an intervention concept", () => {
    expect(
      buildHarmsSearchQuery({ intervention: "  ", mode: "known" })
    ).toBe("");
  });

  it("uses a named important harm without imposing population or design limits", () => {
    const query = buildHarmsSearchQuery({
      intervention: '"bisphosphonates"[mh] OR bisphosphonate*[tiab]',
      population: 'osteoporosis[mh]',
      specificHarm: '"osteonecrosis of the jaw"[mh] OR MRONJ[tiab]',
      mode: "known",
    });

    expect(query).toContain('("bisphosphonates"[mh]');
    expect(query).toContain('("osteonecrosis of the jaw"[mh]');
    expect(query).not.toContain("osteoporosis[mh]");
    expect(query).not.toContain(GENERIC_HARMS_SENSITIVE_EXPRESSION);
    expect(query).not.toContain(RARE_HARMS_SUPPLEMENT_EXPRESSION);
  });

  it("adds the opt-in population and generic discovery terms for broad searching", () => {
    const query = buildHarmsSearchQuery({
      intervention: "implant*[tiab]",
      population: '"dental implants"[mh]',
      includePopulation: true,
      specificHarm: "peri-implantitis[tiab]",
      mode: "broad",
    });

    expect(query).toContain('("dental implants"[mh])');
    expect(query).toContain("peri-implantitis[tiab]");
    expect(query).toContain(GENERIC_HARMS_SENSITIVE_EXPRESSION);
  });

  it("makes rare-harm searching explicitly supplemental with non-RCT sources", () => {
    const query = buildHarmsSearchQuery({
      intervention: "denosumab[tiab]",
      specificHarm: "fracture*[tiab]",
      mode: "rare",
      excludeAnimalOnly: true,
    });

    expect(query).toContain(RARE_HARMS_SUPPLEMENT_EXPRESSION);
    expect(query).toContain('"case reports"[pt]');
    expect(query).toContain("pharmacovigilance[tiab]");
    expect(query.endsWith(` NOT ${ANIMAL_ONLY_HARMS_EXCLUSION}`)).toBe(true);
  });

  it("uses the generic harms block when no named harm is supplied", () => {
    const query = buildHarmsSearchQuery({
      intervention: "warfarin[tiab]",
      mode: "known",
    });

    expect(query).toContain(GENERIC_HARMS_SENSITIVE_EXPRESSION);
  });

  it("uses the validated high-recall drug concept only for broad drug searching", () => {
    const broad = buildHarmsSearchQuery({
      intervention: "warfarin[tiab]",
      interventionType: "drug",
      mode: "broad",
    });
    const practical = buildHarmsSearchQuery({
      intervention: "warfarin[tiab]",
      interventionType: "drug",
      mode: "known",
    });

    expect(broad).toContain(DRUG_HARMS_SENSITIVE_EXPRESSION);
    expect(broad).toContain("risk[ti]");
    expect(practical).toContain(DRUG_HARMS_BALANCED_EXPRESSION);
    expect(practical).not.toContain("risk[ti]");
  });

  it("does not apply adverse-drug filters to surgery or devices", () => {
    const surgery = buildHarmsSearchQuery({
      intervention: "arthroplast*[tiab]",
      interventionType: "surgery",
      mode: "broad",
    });
    const device = buildHarmsSearchQuery({
      intervention: '"Dental Implants"[mh]',
      interventionType: "device",
      mode: "broad",
    });

    expect(surgery).toContain(SURGERY_HARMS_EXPRESSION);
    expect(surgery).not.toContain('"drug effects"[sh]');
    expect(device).toContain(DEVICE_HARMS_EXPRESSION);
    expect(device).toContain("malfunction*[tiab]");
    expect(device).not.toContain('"drug effects"[sh]');
  });
});
