import { describe, expect, it } from 'vitest';
import {
  ANIMAL_ONLY_EXCLUSION,
  COCHRANE_RCT_SENSITIVITY_MAX_EXPRESSION,
  appendAnimalOnlyExclusion,
  applyStudyDesignFilter,
  studyDesignFilters,
} from './cochraneFilters';

describe('intervention study-design filters', () => {
  it('keeps the Cochrane sensitivity-maximizing PubMed RCT core exact', () => {
    expect(COCHRANE_RCT_SENSITIVITY_MAX_EXPRESSION).toBe(
      '(randomized controlled trial[pt] OR controlled clinical trial[pt] OR randomized[tiab] OR placebo[tiab] OR drug therapy[sh] OR randomly[tiab] OR trial[tiab] OR groups[tiab])'
    );
  });

  it('offers one simple practical CPG and SR choice without a combined option', () => {
    expect(studyDesignFilters.map((filter) => filter.key)).toEqual([
      'none', 'guideline', 'systematic_review', 'rct', 'non_rct',
    ]);
    expect(studyDesignFilters.map((filter) => filter.key)).not.toContain('guideline_or_sr');
  });

  it('keeps the practical CPG expression free of excluded document types', () => {
    const guideline = studyDesignFilters.find((filter) => filter.key === 'guideline')!;
    expect(guideline.expression).toBe('("practice guideline"[pt] OR guideline*[ti])');
    expect(guideline.expression).not.toMatch(/consensus|position statement|practice parameter/i);
    expect(guideline.references?.some((reference) => reference.citation.includes('Lunny C'))).toBe(true);
    expect(guideline.methodsTemplate).toContain('出版年制限は用いなかった');
  });

  it('keeps the practical SR expression simple and reports its provenance', () => {
    const systematic = studyDesignFilters.find((filter) => filter.key === 'systematic_review')!;
    expect(systematic.expression).toContain('systematic[sb]');
    expect(systematic.expression).toContain('"meta-analysis"[pt]');
    expect(systematic.expression).not.toContain('search*[tiab]');
    expect(systematic.references?.some((reference) => reference.citation.includes('Escobar Liquitay'))).toBe(true);
  });

  it('adds animal-only exclusion exactly once and after the design block', () => {
    const rct = studyDesignFilters.find((filter) => filter.key === 'rct')!;
    const query = applyStudyDesignFilter(
      'heart failure[tiab] NOT (animals [mh] NOT humans [mh])',
      rct
    );
    expect(query).toContain('drug therapy[sh]');
    expect(query.endsWith(`NOT ${ANIMAL_ONLY_EXCLUSION}`)).toBe(true);
    expect(appendAnimalOnlyExclusion(query)).toBe(query);
  });

  it('does not claim a restricting non-RCT hedge', () => {
    const nonRct = studyDesignFilters.find((filter) => filter.key === 'non_rct');
    expect(nonRct?.expression).toBe('');
    expect(nonRct?.caution).toContain('検証済み式');
  });
});
