import { describe, expect, it } from 'vitest';
import { topicFields, topicInitialPrompt } from './topicExploration';

describe('topic exploration prompt', () => {
  it('keeps the simple one-input workflow', () => {
    expect(topicFields).toHaveLength(1);
    expect(topicFields[0].key).toBe('question');
    expect(topicFields[0].required).toBe(true);
  });

  it('keeps normal search neutral and asks one high-value question first', () => {
    expect(topicInitialPrompt).toContain(
      '支持、反対、条件付き限定、修正、別解釈、原典との差を中立に探索'
    );
    expect(topicInitialPrompt).toContain('確認質問を原則1問だけ返す');
    expect(topicInitialPrompt).toContain('気づいていない可能性のある論点');
    expect(topicInitialPrompt).toContain(
      '最初の応答では、論文名、PMID、DOI、検索結果、長い検索式を出さない'
    );
  });

  it('does not allow self-reported browsing or memory-only citations', () => {
    expect(topicInitialPrompt).toContain(
      '利用できない機能がある場合は、その機能を使ったように装ってはいけません'
    );
    expect(topicInitialPrompt).toContain(
      'モデルの内部知識・記憶は、検索語を考えるためには使えますが、論文の実在確認や本文確認の根拠には使えません'
    );
    expect(topicInitialPrompt).toContain('PMID、PMCID、DOI、著者、年、巻号頁を推測');
  });

  it('separates evidence states and keeps the result table compact', () => {
    expect(topicInitialPrompt).toContain('A. 全文中の該当箇所確認済み');
    expect(topicInitialPrompt).toContain('B. 書誌・抄録確認済み');
    expect(topicInitialPrompt).toContain('C. 探索手掛かり');
    expect(topicInitialPrompt).toContain('D. 不一致・実在未確認');
    expect(topicInitialPrompt).toContain(
      '| No | 論文・識別子 | 質問との関係 | 確認状態 | 本文証拠の場所 | 見落とし型・関連理由 |'
    );
    expect(topicInitialPrompt).not.toContain('| No | 優先度 | 確度 | 分類 |');
  });

  it('delimits the user request from the execution instructions', () => {
    expect(topicInitialPrompt).toContain('<USER_REQUEST>');
    expect(topicInitialPrompt).toContain('{{question}}');
    expect(topicInitialPrompt).toContain('</USER_REQUEST>');
  });
});
