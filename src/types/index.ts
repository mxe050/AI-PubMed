export type StrategyType =
  | "topic_exploration"
  | "systematic_review"
  | "grade_adolopment";

export type SearchVariantType =
  | "broad"
  | "balanced"
  | "narrow"
  | "source_guideline"
  | "existing_sr"
  | "update_search"
  | "de_novo"
  | "etd_problem"
  | "etd_benefits_harms"
  | "etd_values_preferences"
  | "etd_resource_use"
  | "etd_equity"
  | "etd_acceptability"
  | "etd_feasibility"
  | "adopt_adapt_denovo";

export interface AppSettings {
  schemaVersion: 1;
  ncbiApiKey?: string;
  saveApiKey: boolean;
  tool: string;
  email?: string;
  requestIntervalWithoutKeyMs: number;
  requestIntervalWithKeyMs: number;
}

export interface AbstractSection {
  label?: string;
  nlmCategory?: string;
  text: string;
}

export interface CommentsCorrection {
  refType: string;
  pmid?: string;
  note?: string;
}

export interface PubMedArticle {
  pmid: string;
  pmcid?: string;
  title?: string;
  authors?: string[];
  journal?: string;
  year?: string;
  pubDate?: string;
  doi?: string;
  abstractText?: string;
  abstractSections?: AbstractSection[];
  meshTerms?: string[];
  publicationTypes?: string[];
  commentsCorrections?: CommentsCorrection[];
  corporateAuthors?: string[];
  retrievalSources?: Array<"CPG" | "SR">;
  bibliographicStatus?:
    | "confirmed"
    | "unverified"
    | "unverifiable";
  contentVerificationStatus?:
    | "abstract_may_support"
    | "full_text_required"
    | "unverified";
  verified: boolean;
  source: "esummary" | "efetch" | "manual";
}

export interface PubMedSearchResult {
  id: string;
  searchStringId: string;
  query: string;
  count: number;
  idList: string[];
  queryTranslation?: string;
  warningList?: string[];
  errorList?: string[];
  warnings?: string[];
  queryParameters?: Record<string, string>;
  retrievalSource?: "CPG" | "SR";
  knownPmidBenchmark?: KnownPmidBenchmarkResult;
  articles: PubMedArticle[];
  fetchedAt: string;
  apiMode: "no_api_key" | "user_api_key";
  error?: string;
}

export interface KnownPmidBenchmarkResult {
  requestedPmids: string[];
  matchedPmids: string[];
  missedPmids: string[];
  benchmarkQuery: string;
  warnings?: string[];
  error?: string;
}

export interface SearchStringItem {
  id: string;
  variantType: SearchVariantType;
  label: string;
  searchString: string;
  pubmedUrl?: string;
  resultCount?: number;
  pubmedSearchResultId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PromptRun {
  id: string;
  promptType: string;
  promptText: string;
  aiResponse?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchProject {
  schemaVersion: 1;
  id: string;
  strategyType: StrategyType;
  title: string;
  inputData: Record<string, string>;
  promptRuns: PromptRun[];
  searchStrings: SearchStringItem[];
  pubmedResults: PubMedSearchResult[];
  finalSearchStringId?: string;
  verifiedPmids?: PubMedArticle[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const STORAGE_KEYS = {
  projects: "pubmed_prompt_tool_projects_v4",
  settings: "pubmed_prompt_tool_settings_v4",
  draft: "pubmed_prompt_tool_draft_state_v4",
} as const;

export const defaultSettings: AppSettings = {
  schemaVersion: 1,
  saveApiKey: false,
  tool: "pubmed_prompt_tool",
  requestIntervalWithoutKeyMs: 400,
  requestIntervalWithKeyMs: 120,
};
