export function convertNBIBtoRIS(content: string): string {
  const lines = content.split('\n');
  const records: Record<string, string[]>[] = [];
  let currentRecord: Record<string, string[]> = {};
  let lastTag: string | null = null;

  for (const line of lines) {
    if (!line.trim()) continue;

    const match = line.match(/^([A-Z]{2,4})\s*-\s?(.*)/);
    if (match) {
      const tag = match[1].trim();
      const value = match[2].trim();

      if (tag === 'PMID' && Object.keys(currentRecord).length > 0) {
        records.push(currentRecord);
        currentRecord = {};
      }

      if (currentRecord[tag]) {
        currentRecord[tag].push(value);
      } else {
        currentRecord[tag] = [value];
      }
      lastTag = tag;
    } else {
      if (lastTag && currentRecord[lastTag]) {
        const lastIndex = currentRecord[lastTag].length - 1;
        currentRecord[lastTag][lastIndex] += ' ' + line.trim();
      }
    }
  }

  if (Object.keys(currentRecord).length > 0) {
    records.push(currentRecord);
  }

  if (records.length === 0) {
    throw new Error('有効なNBIBレコードが見つかりませんでした。');
  }

  let ris = '';
  for (const rec of records) {
    ris += 'TY  - JOUR\n';

    if (rec['TI']) ris += 'TI  - ' + rec['TI'][0] + '\n';

    const authors = rec['FAU'] || rec['AU'];
    if (authors) {
      for (const au of authors) {
        ris += 'AU  - ' + au + '\n';
      }
    }

    if (rec['AB']) ris += 'AB  - ' + rec['AB'].join(' ') + '\n';

    if (rec['JT']) ris += 'JF  - ' + rec['JT'][0] + '\n';
    else if (rec['TA']) ris += 'JO  - ' + rec['TA'][0] + '\n';
    else if (rec['SO']) ris += 'JO  - ' + rec['SO'][0] + '\n';

    if (rec['DP']) {
      const yearMatch = rec['DP'][0].match(/\d{4}/);
      if (yearMatch) ris += 'PY  - ' + yearMatch[0] + '\n';
    }

    if (rec['VI']) ris += 'VL  - ' + rec['VI'][0] + '\n';
    if (rec['IP']) ris += 'IS  - ' + rec['IP'][0] + '\n';
    if (rec['PG']) {
      const pages = rec['PG'][0].split('-');
      ris += 'SP  - ' + pages[0] + '\n';
      if (pages.length > 1) ris += 'EP  - ' + pages[1] + '\n';
    }

    if (rec['LID']) {
      for (const lid of rec['LID']) {
        if (lid.includes('[doi]')) {
          ris += 'DO  - ' + lid.replace(' [doi]', '') + '\n';
        }
      }
    }

    if (rec['PMID']) {
      ris += 'ID  - ' + rec['PMID'][0] + '\n';
      ris += 'AN  - ' + rec['PMID'][0] + '\n';
    }

    if (rec['LA']) ris += 'LA  - ' + rec['LA'][0] + '\n';

    ris += 'ER  - \n\n';
  }

  return ris;
}
