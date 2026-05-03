import { useState } from "react";
import type { PubMedSearchResult } from "../types";
import { buildPrompt } from "../utils/buildPrompt";
import { buildApiFeedbackBlock } from "../utils/buildApiFeedbackBlock";
import { buildAbstractsBlock } from "../utils/buildAbstractsBlock";
import {
  topicSynthesisPrompt,
  topicPlainEnhancedPrompt,
} from "../prompts/topicExploration";

interface Props {
  question: string;
  executedSearchString: string;
  pubmedResult: PubMedSearchResult;
}

export function TopicSynthesisGenerator({
  question,
  executedSearchString,
  pubmedResult,
}: Props) {
  const articlesWithAbstract = pubmedResult.articles.filter(
    (a) => a.abstractText
  ).length;

  // Prompt 1: 元の疑問そのまま（プレーン）
  const plainPrompt = question;

  // Prompt 2: プレーン強化版
  const plainEnhanced = buildPrompt(topicPlainEnhancedPrompt, { question });

  // Prompt 3: PubMed統合版
  const synthesisPrompt = buildPrompt(topicSynthesisPrompt, {
    question,
    executedSearchString,
    apiFeedbackBlock: buildApiFeedbackBlock(pubmedResult),
    abstractsBlock: buildAbstractsBlock(pubmedResult),
  });

  return (
    <div className="topic-three-prompts">
      <p className="hint">
        トピック探索では、以下の<strong>3本のAIプロンプト</strong>を提示します。
        それぞれ性質が異なるため、目的に応じて使い分けてください。
        <strong>1本目・2本目</strong>はAIに貼り付けて回答を得たらそこで終了です（必要なら「AI出力ファクトチェック」タブで検証）。
        <strong>3本目</strong>はPubMed結果を統合した本格版で、回答後にファクトチェックタブでハルシネーションを検出する流れです。
      </p>

      {/* === Prompt 1: Plain === */}
      <PromptCard
        title="プロンプト1：プレーン版（元の疑問そのまま）"
        kind="plain"
        prompt={plainPrompt}
        copyLabel="元の疑問をコピー"
        terminal
      >
        <details>
          <summary>
            <strong>なぜこれが必要か（クリックで詳細）</strong>
          </summary>
          <ul>
            <li>
              アプリで構造化・PubMed連動したプロンプトを送ると、AIは<strong>そのプロンプトの形式に合わせて</strong>答えるバイアスがかかります。
            </li>
            <li>
              元の疑問の本質を、AIが自然に解釈した回答が、本当に知りたかったことに最も近い場合があります。
            </li>
            <li>
              検索式・PubMed結果・MeSH・抄録を一切参照させず、AIの「素」の知識・解釈を引き出すのが目的です。
            </li>
            <li>
              この回答をベースに、3本目のPubMed統合版と比較すると、構造化で失われがちな「本質」が見えてきます。
            </li>
          </ul>
        </details>

        <details>
          <summary>
            <strong>使うAIモデルについて（クリックで詳細）</strong>
          </summary>
          <ul>
            <li>
              このプロンプトは内容が短く、AIモデルの<strong>地力</strong>がそのまま出ます。
              小型・無料モデルでは表面的な回答になりがちです。
            </li>
            <li>
              ChatGPT・Claude・Geminiの<strong>Pro/上位モデル</strong>（GPT-5、Claude 4.7
              Opus、Gemini 2.5 Proなど）の利用を強く推奨します。
            </li>
            <li>
              無料プランでも、Pro／上位モデルが<strong>1日数回程度は利用できる</strong>ことが多いので（各サービスの仕様による）、まずは無料枠でも上位モデルを試してみてください。
            </li>
            <li>
              安定して質の高い回答を得るには、有料プランが望ましいです。
            </li>
          </ul>
        </details>

        <p className="hint">
          ※ このプロンプトは、ハルシネーションラベル指示も含まないAIの「素」の回答を得るためのものです。
          AIの回答は「AI出力ファクトチェック」タブで検証できますが、ラベル無しの場合PMID実在確認とURL確認が中心になります。
        </p>
      </PromptCard>

      {/* === Prompt 2: Plain enhanced === */}
      <PromptCard
        title="プロンプト2：プレーン強化版（プレーンの良さを残しつつ、ファクトチェック対応）"
        kind="plain-enhanced"
        prompt={plainEnhanced}
        copyLabel="プレーン強化プロンプトをコピー"
        terminal
      >
        <details>
          <summary>
            <strong>プロンプト1との違い（クリックで詳細）</strong>
          </summary>
          <ul>
            <li>
              質問の本質はプロンプト1と同じく「もとの疑問そのまま」ですが、回答に
              <strong>ハルシネーションラベル</strong>
              （【AI記憶・確認済み】【AI記憶・未確認】【一般論】）の付与を指示しています。
            </li>
            <li>
              これにより、後で「AI出力ファクトチェック」タブで検証する際、確認すべきPMIDや事実が明確に区別されます。
            </li>
            <li>
              構造化・検索式化はせず、ユーザーの疑問に直接答えてもらうという姿勢はプロンプト1と同じです。
            </li>
          </ul>
        </details>
        <p className="hint">
          ※ プロンプト1と同じく、AIモデルの地力が出ます。Pro／上位モデルでの利用を推奨します。
        </p>
      </PromptCard>

      {/* === Prompt 3: PubMed integrated synthesis === */}
      <PromptCard
        title="プロンプト3：PubMed統合版（検索結果＋訓練知識を統合する本格版）"
        kind="synthesis"
        prompt={synthesisPrompt}
        copyLabel="統合プロンプトをコピー"
        terminal={false}
      >
        <details>
          <summary>
            <strong>このプロンプトの特徴（クリックで詳細）</strong>
          </summary>
          <ul>
            <li>
              PubMed検索結果（タイトル・抄録・MeSH・Publication Types・Query
              Translation）を自動的にプロンプトに含めます。
            </li>
            <li>
              抄録取得済み: <strong>{articlesWithAbstract}</strong> /{" "}
              {pubmedResult.articles.length} 件
            </li>
            <li>
              AIは「PubMedの客観的データ」と「論文の考察セクションに含まれる訓練知識」を統合して回答します。
            </li>
            <li>
              PubMed結果がアンカーになるため、無料・小型モデルでもプロンプト1・2より安定した回答が得られやすい傾向があります。
            </li>
          </ul>
        </details>

        <div className="next-step-hint">
          <h4>このプロンプトの次にすること</h4>
          <ol>
            <li>上のプロンプトをコピー</li>
            <li>ChatGPT / Claude / Geminiなどに貼り付けて統合回答を取得</li>
            <li>
              <strong>「AI出力ファクトチェック」タブ</strong>に統合回答を貼り付け
            </li>
            <li>PMID実在確認＋抄録取得＋URL確認でハルシネーションを検出</li>
          </ol>
        </div>
      </PromptCard>
    </div>
  );
}

function PromptCard({
  title,
  kind,
  prompt,
  copyLabel,
  terminal,
  children,
}: {
  title: string;
  kind: "plain" | "plain-enhanced" | "synthesis";
  prompt: string;
  copyLabel: string;
  terminal: boolean;
  children?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = prompt;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className={`prompt-card prompt-card-${kind}`}>
      <div className="prompt-card-header">
        <h3>{title}</h3>
        <span className={`prompt-tag prompt-tag-${terminal ? "terminal" : "continues"}`}>
          {terminal ? "→ ここで終了（必要に応じて検証）" : "→ ファクトチェックタブへ続く"}
        </span>
      </div>

      {children}

      <pre className="prompt-text">{prompt}</pre>

      <button className="btn btn-primary" onClick={handleCopy}>
        {copied ? "コピーしました" : copyLabel}
      </button>
    </div>
  );
}
