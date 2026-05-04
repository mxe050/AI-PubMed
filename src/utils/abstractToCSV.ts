interface PubMedRecord {
  pmid: string;
  title: string;
  authors: string;
  citation: string;
  firstAuthor: string;
  journal: string;
  publicationYear: string;
  doi: string;
  pmcid: string;
  abstract: string;
}

export function parseAbstractText(content: string): PubMedRecord[] {
  const records: PubMedRecord[] = [];
  const rawRecords = content.split(/\n(?=\d+\.\s)/);

  for (const raw of rawRecords) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const record = parseSingleRecord(trimmed);
    if (record) records.push(record);
  }

  return records;
}

function parseSingleRecord(text: string): PubMedRecord | null {
  const lines = text.split('\n');
  if (lines.length < 3) return null;

  const citationMatch = lines[0].match(/^\d+\.\s+(.+)/);
  if (!citationMatch) return null;

  let citationLines = [citationMatch[1]];
  let i = 1;
  while (i < lines.length && lines[i].trim() && !isBlankLine(lines[i])) {
    citationLines.push(lines[i].trim());
    i++;
  }
  const citation = citationLines.join(' ');

  while (i < lines.length && isBlankLine(lines[i])) i++;

  let titleLines: string[] = [];
  while (i < lines.length && lines[i].trim() && !isBlankLine(lines[i])) {
    titleLines.push(lines[i].trim());
    i++;
  }
  const title = titleLines.join(' ');

  while (i < lines.length && isBlankLine(lines[i])) i++;

  let authorLines: string[] = [];
  while (i < lines.length && lines[i].trim() && !lines[i].startsWith('Author information:') && !isBlankLine(lines[i])) {
    authorLines.push(lines[i].trim());
    i++;
  }
  const authors = authorLines.join(' ');

  const firstAuthor = authors.split(',')[0]?.replace(/\(\d+\)/, '').trim() || '';

  let pmid = '';
  let doi = '';
  let pmcid = '';
  const abstractSections: string[] = [];
  let inAbstract = false;

  const abstractKeywords = [
    'BACKGROUND:', 'OBJECTIVES:', 'OBJECTIVE:', 'METHODS:', 'RESULTS:',
    'CONCLUSIONS:', 'CONCLUSION:', 'SEARCH METHODS:', 'SELECTION CRITERIA:',
    'DATA COLLECTION AND ANALYSIS:', 'MAIN RESULTS:', "AUTHORS' CONCLUSIONS:",
    'PURPOSE:', 'DESIGN:', 'SETTING:', 'PATIENTS:', 'PARTICIPANTS:',
    'INTERVENTIONS:', 'MAIN OUTCOME MEASURES:', 'OUTCOME MEASURES:',
    'INTRODUCTION:', 'AIM:', 'AIMS:', 'MATERIAL AND METHODS:', 'MATERIALS AND METHODS:',
    'SIGNIFICANCE:', 'CONTEXT:', 'DATA SOURCES:', 'STUDY SELECTION:',
    'DATA EXTRACTION:', 'DATA SYNTHESIS:', 'LIMITATIONS:',
  ];

  for (let j = i; j < lines.length; j++) {
    const line = lines[j];
    const trimmedLine = line.trim();

    const pmidMatch = trimmedLine.match(/^PMID:\s*(\d+)/);
    if (pmidMatch) {
      pmid = pmidMatch[1];
      continue;
    }

    const doiMatch = trimmedLine.match(/^DOI:\s*(.+)/);
    if (doiMatch) {
      doi = doiMatch[1].trim();
      continue;
    }

    const pmcidMatch = trimmedLine.match(/^PMCID:\s*(\S+)/);
    if (pmcidMatch) {
      pmcid = pmcidMatch[1];
      continue;
    }

    if (trimmedLine.startsWith('Conflict of interest statement:')) continue;
    if (trimmedLine.startsWith('Author information:')) {
      while (j + 1 < lines.length && lines[j + 1].trim() && !isBlankLine(lines[j + 1]) && !abstractKeywords.some(k => lines[j + 1].trim().startsWith(k))) {
        j++;
      }
      continue;
    }
    if (trimmedLine.startsWith('Comment in') || trimmedLine.startsWith('Update of') || trimmedLine.startsWith('Erratum in') || trimmedLine.startsWith('Comment on')) {
      while (j + 1 < lines.length && lines[j + 1].trim().startsWith('    ')) {
        j++;
      }
      continue;
    }

    if (!inAbstract && abstractKeywords.some(k => trimmedLine.startsWith(k))) {
      inAbstract = true;
    }

    if (!inAbstract && trimmedLine && !trimmedLine.startsWith('DOI:') && !trimmedLine.startsWith('PMID:') && !trimmedLine.startsWith('PMCID:')) {
      if (j > i + 3 && trimmedLine.length > 40 && !trimmedLine.match(/^\(\d+\)/)) {
        inAbstract = true;
      }
    }

    if (inAbstract) {
      if (trimmedLine.startsWith('DOI:') || trimmedLine.startsWith('PMID:') || trimmedLine.startsWith('PMCID:') || trimmedLine.startsWith('Conflict of interest')) {
        inAbstract = false;
        continue;
      }
      if (trimmedLine) {
        abstractSections.push(trimmedLine);
      }
    }
  }

  const abstract = abstractSections.join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const journalMatch = citation.match(/^(.+?)\.\s+\d{4}/);
  const journal = journalMatch ? journalMatch[1] : '';

  const yearMatch = citation.match(/\b((?:19|20)\d{2})\b/);
  const publicationYear = yearMatch ? yearMatch[1] : '';

  if (!pmid && !title) return null;

  return {
    pmid,
    title,
    authors: authors.replace(/\(\d+\)/g, '').replace(/\s{2,}/g, ' ').trim(),
    citation,
    firstAuthor,
    journal,
    publicationYear,
    doi,
    pmcid,
    abstract,
  };
}

function isBlankLine(line: string): boolean {
  return !line || line.trim() === '';
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

export function recordsToCSV(records: PubMedRecord[]): string {
  const headers = ['PMID', 'Title', 'Authors', 'Citation', 'First Author', 'Journal/Book', 'Publication Year', 'DOI', 'PMCID', 'Abstract'];
  const lines = [headers.join(',')];

  for (const r of records) {
    const row = [
      escapeCSV(r.pmid),
      escapeCSV(r.title),
      escapeCSV(r.authors),
      escapeCSV(r.citation),
      escapeCSV(r.firstAuthor),
      escapeCSV(r.journal),
      escapeCSV(r.publicationYear),
      escapeCSV(r.doi),
      escapeCSV(r.pmcid),
      escapeCSV(r.abstract),
    ];
    lines.push(row.join(','));
  }

  return lines.join('\n');
}
