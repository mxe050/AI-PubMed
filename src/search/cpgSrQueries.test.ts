import { describe, expect, it } from 'vitest';
import {
  CPG_FILTER,
  CPG_FILTER_CANDIDATE_2,
  CPG_FORBIDDEN_TERMS,
  FORBIDDEN_NOT_TARGETS,
  SR_CORE,
  SR_SENSITIVITY_EXTENSION,
  buildSrFilter,
} from './cpgSrFilters';
import {
  buildCpgQuery,
  buildSrQuery,
  mergeRetrievalProvenance,
} from './cpgSrQueries';

const TOPIC = '(heart failure[mh] OR "heart failure"[tiab])';

describe('independent CPG/SR query generation', () => {
  it('builds independent queries without publication-date restrictions', () => {
    const cpg = buildCpgQuery(TOPIC);
    const sr = buildSrQuery(TOPIC);
    expect(cpg).toContain(CPG_FILTER);
    expect(cpg).not.toContain('systematic[sb]');
    expect(sr).toContain(SR_CORE);
    expect(sr).not.toContain('practice guideline');
    for (const query of [cpg, sr]) {
      expect(query).not.toMatch(/\[(?:dp|edat|crdt|epdat|ppdat|pdat)\]/i);
      expect(query).not.toMatch(/\b(?:mindate|maxdate|datetype)\b/i);
    }
  });

  it('rejects a date-limited TOPIC_QUERY', () => {
    expect(() => buildCpgQuery('asthma AND 2020:2025[dp]')).toThrow(/日付制限/);
    expect(() => buildSrQuery('asthma AND "last 3 years"[dp]')).toThrow(/日付制限/);
  });

  it('contains none of the forbidden CPG substitutes', () => {
    for (const candidate of [CPG_FILTER, CPG_FILTER_CANDIDATE_2]) {
      for (const term of CPG_FORBIDDEN_TERMS) {
        expect(candidate.toLowerCase()).not.toContain(term);
      }
    }
  });

  it('keeps the abstract heuristic outside SR_CORE and extensions opt-in', () => {
    expect(SR_CORE).not.toContain('search*[tiab]');
    expect(SR_CORE).not.toContain('eligibility criteria');
    expect(buildSrFilter()).not.toContain(SR_SENSITIVITY_EXTENSION);
    expect(buildSrFilter({ sensitivityExtension: true })).toContain(
      SR_SENSITIVITY_EXTENSION
    );
  });

  it('uses only limited SR exclusions and no forbidden NOT targets', () => {
    const query = buildSrQuery(TOPIC);
    expect(query).toContain('protocol*[ti]');
    expect(query).toContain('"scoping review*"[ti]');
    expect(query).not.toContain('scoping[ti]');
    for (const target of FORBIDDEN_NOT_TARGETS) expect(query).not.toContain(target);
  });

  it('merges duplicate PMIDs without losing retrieval provenance', () => {
    const merged = mergeRetrievalProvenance([
      {
        pmid: '1', retrievalSources: ['CPG'],
        provenance: [{ source: 'CPG', query: 'cpg', retrievedAt: '2026-01-01' }],
      },
      {
        pmid: '1', retrievalSources: ['SR'],
        provenance: [{ source: 'SR', query: 'sr', retrievedAt: '2026-01-01' }],
      },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].retrievalSources).toEqual(['CPG', 'SR']);
    expect(merged[0].provenance).toHaveLength(2);
  });
});

