export type GuidelineCurrentStatus =
  | 'current'
  | 'superseded'
  | 'archived'
  | 'withdrawn'
  | 'related_update'
  | 'needs_manual_review';

export type GuidelineDocumentRole =
  | 'full_guideline'
  | 'full_revision'
  | 'focused_update'
  | 'partial_update'
  | 'addendum'
  | 'executive_summary'
  | 'synopsis'
  | 'pocket_version'
  | 'co_publication'
  | 'unknown';

export interface GuidelineStatusEvidence {
  sourceType: 'official_issuer' | 'explicit_supersession' | 'identifier_relation' | 'bibliographic_inference';
  status: Exclude<GuidelineCurrentStatus, 'needs_manual_review'>;
  sourceUrl?: string;
  checkedAt?: string;
  statement?: string;
}

export interface GuidelineRecord {
  guidelineFamilyId: string;
  pmid: string;
  doi?: string;
  issuer?: string;
  title: string;
  version?: string;
  publicationDate?: string;
  role: GuidelineDocumentRole;
  statusEvidence?: GuidelineStatusEvidence[];
  supersedes?: string[];
  supersededBy?: string[];
  relatedPublications?: string[];
}

export interface GuidelineVersionDecision {
  guidelineFamilyId: string;
  representativeRecord?: string;
  pmid: string;
  doi?: string;
  issuer?: string;
  title: string;
  version?: string;
  publicationDate?: string;
  currentStatus: GuidelineCurrentStatus;
  statusBasis: string;
  statusSourceUrl?: string;
  statusCheckedAt?: string;
  supersedes: string[];
  supersededBy: string[];
  relatedPublications: string[];
  decision: 'retain_representative' | 'retain_related' | 'retain_audit' | 'manual_review';
  manualReviewReason?: string;
}

