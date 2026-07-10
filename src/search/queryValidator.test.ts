import { describe, expect, it } from 'vitest';
import { SR_CORE, SR_SENSITIVITY_EXTENSION } from './cpgSrFilters';
import { validatePubMedQuery } from './queryValidator';

function codes(query: string, kind: 'general' | 'cpg' | 'sr' | 'sr_core') {
  return validatePubMedQuery(query, kind).diagnostics.map((item) => item.code);
}

describe('PubMed query validator', () => {
  it('detects syntax errors', () => {
    expect(codes('(asthma[tiab]', 'general')).toContain('UNBALANCED_PARENTHESES');
    expect(codes('"asthma[tiab]', 'general')).toContain('UNBALANCED_QUOTES');
    expect(codes('asthma AND OR trial', 'general')).toContain('ORPHAN_BOOLEAN');
    expect(codes('asthma[xyz]', 'general')).toContain('UNKNOWN_FIELD_TAG');
  });

  it('detects lower-case booleans and proximity/wildcard conflicts', () => {
    expect(codes('asthma and trial', 'general')).toContain('LOWERCASE_BOOLEAN');
    expect(codes('"heart fail*"[tiab:~3]', 'general')).toContain('PROXIMITY_WILDCARD');
  });

  it('rejects forbidden CPG terms and dates', () => {
    expect(codes('asthma AND consensus[ti]', 'cpg')).toContain('CPG_FORBIDDEN_TERM');
    expect(codes('asthma AND 2020:2025[dp]', 'cpg')).toContain('DATE_LIMIT_FORBIDDEN');
  });

  it('rejects dangerous NOT and SR heuristic in CORE', () => {
    expect(codes(`${SR_CORE} NOT editorial[pt]`, 'sr')).toContain('DANGEROUS_NOT');
    expect(codes(`(${SR_CORE} OR ${SR_SENSITIVITY_EXTENSION})`, 'sr_core'))
      .toContain('SR_HEURISTIC_IN_CORE');
  });
});

