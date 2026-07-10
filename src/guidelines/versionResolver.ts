import type {
  GuidelineRecord,
  GuidelineStatusEvidence,
  GuidelineVersionDecision,
} from './model';

const EVIDENCE_PRIORITY: Record<GuidelineStatusEvidence['sourceType'], number> = {
  official_issuer: 4,
  explicit_supersession: 3,
  identifier_relation: 2,
  bibliographic_inference: 1,
};

const RELATED_ROLES = new Set<GuidelineRecord['role']>([
  'focused_update',
  'partial_update',
  'addendum',
  'executive_summary',
  'synopsis',
  'pocket_version',
  'co_publication',
]);

function strongestEvidence(record: GuidelineRecord): GuidelineStatusEvidence | undefined {
  return [...(record.statusEvidence ?? [])].sort(
    (left, right) => EVIDENCE_PRIORITY[right.sourceType] - EVIDENCE_PRIORITY[left.sourceType]
  )[0];
}

/**
 * Deterministic post-retrieval version resolution.
 * Publication date alone never establishes current status or supersession.
 */
export function resolveCurrentGuidelineVersions(
  records: GuidelineRecord[]
): GuidelineVersionDecision[] {
  const groups = new Map<string, GuidelineRecord[]>();
  for (const record of records) {
    const list = groups.get(record.guidelineFamilyId) ?? [];
    list.push(record);
    groups.set(record.guidelineFamilyId, list);
  }

  const decisions: GuidelineVersionDecision[] = [];
  for (const [familyId, family] of groups) {
    const explicitCurrent = family.filter(
      (record) => strongestEvidence(record)?.status === 'current'
    );
    const fullCurrent = explicitCurrent.find(
      (record) => record.role === 'full_guideline' || record.role === 'full_revision'
    );

    for (const record of family) {
      const evidence = strongestEvidence(record);
      const isRelated = RELATED_ROLES.has(record.role);
      const hasExplicitReplacement =
        evidence?.status === 'superseded' || (record.supersededBy?.length ?? 0) > 0;
      let currentStatus: GuidelineVersionDecision['currentStatus'];
      let decision: GuidelineVersionDecision['decision'];
      let basis: string;
      let manualReviewReason: string | undefined;

      if (evidence) {
        currentStatus = isRelated && evidence.status === 'current' ? 'related_update' : evidence.status;
        basis = evidence.statement || `${evidence.sourceType}による状態確認`;
        decision = currentStatus === 'current'
          ? 'retain_representative'
          : isRelated || currentStatus === 'related_update'
            ? 'retain_related'
            : 'retain_audit';
      } else if (hasExplicitReplacement) {
        currentStatus = 'superseded';
        basis = '明示的なsuperseded_by関係';
        decision = 'retain_audit';
      } else if (isRelated) {
        currentStatus = 'related_update';
        basis = '文書種別から関連更新として保持（全面置換とは判定しない）';
        decision = 'retain_related';
        manualReviewReason = '発行機関による置換範囲の確認が必要';
      } else {
        currentStatus = 'needs_manual_review';
        basis = '出版日だけではcurrent / supersededを判定できない';
        decision = 'manual_review';
        manualReviewReason = '発行機関の公式ページまたは明示的な版関係を確認できない';
      }

      decisions.push({
        guidelineFamilyId: familyId,
        representativeRecord:
          currentStatus === 'current' ? record.pmid : fullCurrent?.pmid,
        pmid: record.pmid,
        doi: record.doi,
        issuer: record.issuer,
        title: record.title,
        version: record.version,
        publicationDate: record.publicationDate,
        currentStatus,
        statusBasis: basis,
        statusSourceUrl: evidence?.sourceUrl,
        statusCheckedAt: evidence?.checkedAt,
        supersedes: record.supersedes ?? [],
        supersededBy: record.supersededBy ?? [],
        relatedPublications: record.relatedPublications ?? [],
        decision,
        manualReviewReason,
      });
    }
  }
  return decisions;
}

