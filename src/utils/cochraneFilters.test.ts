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

  it('does not mix CPG or SR document filters into design filters', () => {
    expect(studyDesignFilters.map((filter) => filter.key)).toEqual([
      'none', 'rct', 'non_rct',
    ]);
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

