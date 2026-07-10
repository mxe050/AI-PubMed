import type { GuidelineVersionDecision } from './model';

const HEADERS = [
  'guideline_family_id', 'representative_record', 'pmid', 'doi', 'issuer',
  'title', 'version', 'publication_date', 'current_status', 'status_basis',
  'status_source_url', 'status_checked_at', 'supersedes', 'superseded_by',
  'related_publications', 'decision', 'manual_review_reason',
] as const;

function cell(value: unknown): string {
  const text = Array.isArray(value) ? value.join('|') : String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

export function exportGuidelineAuditCsv(decisions: GuidelineVersionDecision[]): string {
  const rows = decisions.map((item) => [
    item.guidelineFamilyId, item.representativeRecord, item.pmid, item.doi,
    item.issuer, item.title, item.version, item.publicationDate,
    item.currentStatus, item.statusBasis, item.statusSourceUrl,
    item.statusCheckedAt, item.supersedes, item.supersededBy,
    item.relatedPublications, item.decision, item.manualReviewReason,
  ].map(cell).join(','));
  return [HEADERS.join(','), ...rows].join('\n');
}

