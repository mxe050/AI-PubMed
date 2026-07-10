import { describe, expect, it } from 'vitest';
import type { GuidelineRecord } from './model';
import { resolveCurrentGuidelineVersions } from './versionResolver';

const base: GuidelineRecord = {
  guidelineFamilyId: 'society-topic', pmid: '1', title: 'Full guideline',
  role: 'full_guideline', publicationDate: '2020',
};

describe('guideline version resolution', () => {
  it('uses explicit official evidence and retains superseded records for audit', () => {
    const decisions = resolveCurrentGuidelineVersions([
      { ...base, supersededBy: ['2'], statusEvidence: [{ sourceType: 'explicit_supersession', status: 'superseded', statement: 'Replaced by v2' }] },
      { ...base, pmid: '2', title: 'Full guideline v2', role: 'full_revision', statusEvidence: [{ sourceType: 'official_issuer', status: 'current', sourceUrl: 'https://issuer.example/v2' }] },
    ]);
    expect(decisions.find((item) => item.pmid === '1')?.currentStatus).toBe('superseded');
    expect(decisions.find((item) => item.pmid === '2')?.decision).toBe('retain_representative');
  });

  it.each(['focused_update', 'partial_update', 'addendum'] as const)(
    'does not let a %s automatically replace the base guideline',
    (role) => {
      const decisions = resolveCurrentGuidelineVersions([
        base,
        { ...base, pmid: '2', title: role, role, publicationDate: '2025' },
      ]);
      expect(decisions.find((item) => item.pmid === '1')?.currentStatus).toBe('needs_manual_review');
      expect(decisions.find((item) => item.pmid === '2')?.currentStatus).toBe('related_update');
    }
  );

  it('does not infer current status from the largest publication year', () => {
    const decisions = resolveCurrentGuidelineVersions([
      base,
      { ...base, pmid: '2', publicationDate: '2026' },
    ]);
    expect(decisions.every((item) => item.currentStatus === 'needs_manual_review')).toBe(true);
  });
});

