import type {
  AppSettings,
  PubMedArticle,
  AbstractSection,
  CommentsCorrection,
} from "../types";
import { buildNcbiUrl } from "../utils/buildNcbiUrl";
import type { NcbiRateLimiter } from "../utils/ncbiRateLimiter";

export async function efetchPubMed(
  pmids: string[],
  settings: AppSettings,
  limiter: NcbiRateLimiter
): Promise<PubMedArticle[]> {
  if (pmids.length === 0) return [];

  const url = buildNcbiUrl(
    "efetch.fcgi",
    {
      db: "pubmed",
      id: pmids.join(","),
      retmode: "xml",
      rettype: "abstract",
    },
    settings
  );

  return limiter.schedule(async () => {
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`EFetch failed: ${res.status}`);
    }

    const xmlText = await res.text();
    return parsePubMedXml(xmlText);
  });
}

export function parsePubMedXml(xmlText: string): PubMedArticle[] {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, "application/xml");

  const articles = Array.from(xml.querySelectorAll("PubmedArticle"));

  return articles.map((node) => {
    const pmid = node.querySelector("PMID")?.textContent ?? "";

    const title =
      node.querySelector("ArticleTitle")?.textContent?.trim() ?? undefined;

    const abstractSections: AbstractSection[] = Array.from(
      node.querySelectorAll("AbstractText")
    )
      .map((el) => ({
        label: el.getAttribute("Label") ?? undefined,
        nlmCategory: el.getAttribute("NlmCategory") ?? undefined,
        text: el.textContent?.trim() ?? "",
      }))
      .filter((s) => s.text.length > 0);

    const abstractText =
      abstractSections.length > 0
        ? abstractSections
            .map((s) => (s.label ? `${s.label}: ${s.text}` : s.text))
            .join("\n\n")
        : undefined;

    const commentsCorrections: CommentsCorrection[] = Array.from(
      node.querySelectorAll(
        "CommentsCorrectionsList > CommentsCorrections"
      )
    ).map((el) => ({
      refType: el.getAttribute("RefType") ?? "Unknown",
      pmid: el.querySelector("PMID")?.textContent ?? undefined,
      note: el.querySelector("RefSource")?.textContent ?? undefined,
    }));

    const meshTerms = Array.from(node.querySelectorAll("MeshHeading"))
      .map((heading) => heading.querySelector("DescriptorName")?.textContent)
      .filter((x): x is string => Boolean(x));

    const publicationTypes = Array.from(
      node.querySelectorAll("PublicationType")
    )
      .map((el) => el.textContent)
      .filter((x): x is string => Boolean(x));

    const journal =
      node.querySelector("Journal > Title")?.textContent ??
      node.querySelector("ISOAbbreviation")?.textContent ??
      undefined;

    const year =
      node.querySelector("PubDate > Year")?.textContent ??
      node.querySelector("ArticleDate > Year")?.textContent ??
      undefined;

    return {
      pmid,
      title,
      journal,
      year,
      abstractText,
      abstractSections: abstractSections.length > 0 ? abstractSections : undefined,
      meshTerms,
      publicationTypes,
      commentsCorrections:
        commentsCorrections.length > 0 ? commentsCorrections : undefined,
      verified: Boolean(pmid),
      source: "efetch",
    } satisfies PubMedArticle;
  });
}
