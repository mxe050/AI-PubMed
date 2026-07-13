import { useMemo, useState } from "react";
import { buildPrompt } from "../utils/buildPrompt";
import { ebmPicoBrainstormPrompt } from "../prompts/ebmStep2";
import {
  srEligibilityPrompt,
  srPicoDefinitionPrompt,
} from "../prompts/srPicoDevelopment";
import { srInitialPrompt } from "../prompts/systematicReview";
import { parsePicoFromAiResponse } from "../utils/parsePicoFromAiResponse";
import {
  buildSelectedDefinitionContext,
  collectSelectedDefinitionReferences,
  parseSrDefinitionResponse,
  type SrDefinitionConsultation,
} from "../utils/parseSrDefinitionResponse";
import {
  buildEligibilityContext,
  parseSrEligibilityResponse,
  type SrEligibilityCriteria,
} from "../utils/parseSrEligibilityResponse";
import {
  parseSrTermsFromAiResponse,
  type SrTermsByElement,
} from "../utils/parseSrTermsFromAiResponse";
import { parseKnownPmids } from "../utils/knownPmidBenchmark";
import { PromptDisplay } from "./PromptDisplay";
import { SrDefinitionSelector } from "./SrDefinitionSelector";
import { SrEligibilitySummary } from "./SrEligibilitySummary";

export interface SrPicoValue {
  p: string;
  i: string;
  c: string;
  o: string;
}

interface Props {
  question: string;
  onQuestionChange: (value: string) => void;
  pico: SrPicoValue;
  onPicoChange: (value: SrPicoValue) => void;
  knownPmids: string;
  onKnownPmidsChange: (value: string) => void;
  onTermsReady: (
    terms: SrTermsByElement,
    advice: string[],
    warnings: string[]
  ) => void;
  /** 上流のPICO・定義・適格基準が変わったとき、古い検索表を無効化する。 */
  onSearchInputsChanged: () => void;
}

type Feedback = { kind: "ok" | "error"; text: string } | null;

const SR_PICO_VARIANT_LABEL =
  "PICO案 C：システマティックレビュー用（厳密・網羅的な形）";
const SR_PICO_VARIANT_INSTRUCTION =
  "PICO案 C：システマティックレビュー用（厳密・網羅的な形）の一つだけを作成してください。PICO案 A/B や代替案は出さないでください。";

function FeedbackLine({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  return (
    <p
      className={
        feedback.kind === "ok" ? "pico-autofill-ok" : "pico-autofill-err"
      }
      role={feedback.kind === "error" ? "alert" : "status"}
    >
      {feedback.kind === "ok" ? "✅ " : "⚠ "}
      {feedback.text}
    </p>
  );
}

export function SrPreparationWorkflow({
  question,
  onQuestionChange,
  pico,
  onPicoChange,
  knownPmids,
  onKnownPmidsChange,
  onTermsReady,
  onSearchInputsChanged,
}: Props) {
  const [specialty, setSpecialty] = useState("");

  const [brainstormPrompt, setBrainstormPrompt] = useState("");
  const [brainstormResponse, setBrainstormResponse] = useState("");
  const [brainstormFeedback, setBrainstormFeedback] = useState<Feedback>(null);

  const [definitionPrompt, setDefinitionPrompt] = useState("");
  const [definitionResponse, setDefinitionResponse] = useState("");
  const [definitionFeedback, setDefinitionFeedback] = useState<Feedback>(null);
  const [consultation, setConsultation] =
    useState<SrDefinitionConsultation | null>(null);

  const [eligibilityPrompt, setEligibilityPrompt] = useState("");
  const [eligibilityResponse, setEligibilityResponse] = useState("");
  const [eligibilityFeedback, setEligibilityFeedback] = useState<Feedback>(null);
  const [eligibility, setEligibility] =
    useState<SrEligibilityCriteria | null>(null);

  const [existingSearchStrategy, setExistingSearchStrategy] = useState("");
  const [synonymPrompt, setSynonymPrompt] = useState("");
  const [synonymResponse, setSynonymResponse] = useState("");
  const [synonymFeedback, setSynonymFeedback] = useState<Feedback>(null);

  const parsedKnownPmids = useMemo(
    () => parseKnownPmids(knownPmids),
    [knownPmids]
  );
  const selectedDefinitionCount =
    consultation?.options.filter((option) => option.selected).length ?? 0;

  function resetAfterPico() {
    setDefinitionPrompt("");
    setDefinitionResponse("");
    setDefinitionFeedback(null);
    setConsultation(null);
    setEligibilityPrompt("");
    setEligibilityResponse("");
    setEligibilityFeedback(null);
    setEligibility(null);
    setSynonymPrompt("");
    setSynonymResponse("");
    setSynonymFeedback(null);
    onSearchInputsChanged();
  }

  function resetAfterDefinitions() {
    setEligibilityPrompt("");
    setEligibilityResponse("");
    setEligibilityFeedback(null);
    setEligibility(null);
    setSynonymPrompt("");
    setSynonymResponse("");
    setSynonymFeedback(null);
    onSearchInputsChanged();
  }

  function resetAfterEligibility() {
    setSynonymPrompt("");
    setSynonymResponse("");
    setSynonymFeedback(null);
    onSearchInputsChanged();
  }

  function updatePico(key: keyof SrPicoValue, value: string) {
    onPicoChange({ ...pico, [key]: value });
    resetAfterPico();
  }

  function generateBrainstormPrompt() {
    if (!question.trim()) {
      setBrainstormFeedback({
        kind: "error",
        text: "先にレビューの臨床疑問を入力してください。",
      });
      return;
    }
    setBrainstormPrompt(
      buildPrompt(ebmPicoBrainstormPrompt, {
        question,
        specialty: specialty || "未入力",
        purpose: "システマティックレビュー",
        picoVariantLabel: SR_PICO_VARIANT_LABEL,
        picoVariantInstruction: SR_PICO_VARIANT_INSTRUCTION,
      })
    );
    setBrainstormFeedback(null);
  }

  function applyBrainstormPico() {
    const result = parsePicoFromAiResponse(brainstormResponse);
    if (!result.ok || !result.pico) {
      setBrainstormFeedback({
        kind: "error",
        text: `PICOを読み取れませんでした：${result.reason}。回答末尾の構造化ブロックを確認してください。`,
      });
      return;
    }
    onPicoChange({
      p: result.pico.p || pico.p,
      i: result.pico.i || pico.i,
      c: result.pico.c || pico.c,
      o: result.pico.o || pico.o,
    });
    resetAfterPico();
    setBrainstormFeedback({
      kind: "ok",
      text: "PICO案を下の欄に反映しました。内容を確認・編集してから定義検討へ進んでください。",
    });
  }

  function generateDefinitionPrompt() {
    if (!question.trim() || !pico.p.trim() || !pico.i.trim()) {
      setDefinitionFeedback({
        kind: "error",
        text: "臨床疑問と、最低限P・Iを入力してください。",
      });
      return;
    }
    setDefinitionPrompt(
      buildPrompt(srPicoDefinitionPrompt, {
        question,
        specialty: specialty || "未入力",
        p: pico.p,
        i: pico.i,
        c: pico.c || "未入力・要検討",
        o: pico.o || "未入力・要検討",
        knownPmids: knownPmids || "なし",
      })
    );
    setDefinitionResponse("");
    setDefinitionFeedback(null);
    setConsultation(null);
    resetAfterDefinitions();
  }

  function applyDefinitionResponse() {
    const result = parseSrDefinitionResponse(definitionResponse);
    if (!result.ok || !result.consultation) {
      setDefinitionFeedback({
        kind: "error",
        text: `定義候補を読み取れませんでした：${result.reason}。構造化JSONブロックを確認してください。`,
      });
      return;
    }
    setConsultation(result.consultation);
    resetAfterDefinitions();
    setDefinitionFeedback({
      kind: "ok",
      text: `${result.consultation.options.length}件の定義候補を読み込みました。${
        result.warnings.length ? ` 確認事項：${result.warnings.join(" / ")}` : ""
      }`,
    });
    setTimeout(() => {
      document
        .getElementById("sr-definition-selection")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  function handleConsultationChange(next: SrDefinitionConsultation) {
    setConsultation(next);
    resetAfterDefinitions();
  }

  function generateEligibilityPrompt() {
    if (!consultation) return;
    const selectedP = consultation.options.some(
      (option) => option.element === "P" && option.selected
    );
    const selectedI = consultation.options.some(
      (option) => option.element === "I" && option.selected
    );
    if (!selectedP || !selectedI) {
      setEligibilityFeedback({
        kind: "error",
        text: "最低限、PとIから各1件以上の定義候補を選択してください。",
      });
      return;
    }
    setEligibilityPrompt(
      buildPrompt(srEligibilityPrompt, {
        question,
        p: pico.p,
        i: pico.i,
        c: pico.c || "未入力",
        o: pico.o || "未入力",
        selectedDefinitions: buildSelectedDefinitionContext(consultation),
      })
    );
    setEligibilityResponse("");
    setEligibilityFeedback(null);
    setEligibility(null);
    resetAfterEligibility();
  }

  function applyEligibilityResponse() {
    const result = parseSrEligibilityResponse(eligibilityResponse);
    if (!result.ok || !result.criteria) {
      setEligibilityFeedback({
        kind: "error",
        text: `適格基準を読み取れませんでした：${result.reason}。構造化JSONブロックを確認してください。`,
      });
      return;
    }
    const trustedReferences = consultation
      ? collectSelectedDefinitionReferences(consultation)
      : [];
    const trustedCriteria: SrEligibilityCriteria = {
      ...result.criteria,
      sourceOptionIds:
        consultation?.options
          .filter((option) => option.selected)
          .map((option) => option.id) ?? result.criteria.sourceOptionIds,
      definitionReferences: trustedReferences,
    };
    setEligibility(trustedCriteria);
    onPicoChange({
      p: trustedCriteria.p,
      i: trustedCriteria.i,
      c: trustedCriteria.c,
      o: trustedCriteria.o,
    });
    resetAfterEligibility();
    setEligibilityFeedback({
      kind: "ok",
      text:
        trustedReferences.length > 0
          ? `最終PICO・適格基準を一括文書にまとめ、採用定義の根拠文献${trustedReferences.length}件を引き継ぎました。`
          : "最終PICO・適格基準をまとめましたが、採用した定義候補に根拠文献がありません。原典確認後に採用してください。",
    });
    setTimeout(() => {
      document
        .getElementById("sr-final-eligibility")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  function handleEligibilityChange(next: SrEligibilityCriteria) {
    setEligibility(next);
    onPicoChange({ p: next.p, i: next.i, c: next.c, o: next.o });
    resetAfterEligibility();
  }

  function generateSynonymPrompt() {
    if (!pico.p.trim() || !pico.i.trim()) {
      setSynonymFeedback({
        kind: "error",
        text: "最低限PとIを入力してください。",
      });
      return;
    }
    const selectedDefinitions = consultation
      ? buildSelectedDefinitionContext(consultation)
      : "定義検討を省略。暫定PICOのみを使用する。";
    const eligibilityContext = eligibility
      ? buildEligibilityContext(eligibility)
      : "適格基準は未作成。暫定PICOから予備的な検索語を作成する。";
    setSynonymPrompt(
      buildPrompt(srInitialPrompt, {
        p: pico.p,
        i: pico.i,
        c: pico.c || "未入力",
        o: pico.o || "未入力",
        question: question || "未入力",
        knownPmids: knownPmids || "なし",
        selectedDefinitions,
        eligibilityCriteria: eligibilityContext,
        existingSearchStrategy:
          existingSearchStrategy || "入力なし。新規に候補語を検討する。",
      })
    );
    setSynonymResponse("");
    setSynonymFeedback(null);
  }

  function applySynonymResponse() {
    const result = parseSrTermsFromAiResponse(synonymResponse);
    if (!result.ok || !result.terms) {
      setSynonymFeedback({
        kind: "error",
        text: `検索語を読み取れませんでした：${result.reason}。構造化TERMSブロックを確認してください。`,
      });
      return;
    }
    onTermsReady(result.terms, result.advice, result.warnings);
    const count = Object.values(result.terms).reduce(
      (sum, terms) => sum + terms.length,
      0
    );
    setSynonymFeedback({
      kind: "ok",
      text: `${count}件の候補語を検索表へ反映しました。表のチェックとAIの調整助言を確認してください。`,
    });
  }

  return (
    <>
      <nav className="sr-workflow-map" aria-label="システマティックレビュー検索の作成手順">
        <ol>
          <li><span>1</span>PICO案</li>
          <li><span>2</span>定義と原典</li>
          <li><span>3</span>適格基準</li>
          <li><span>4</span>検索語</li>
          <li><span>5</span>PubMed検索</li>
        </ol>
      </nav>

      <section className="workflow-section">
        <h2>Step 1：レビュー疑問と暫定PICO</h2>
        <div className="sr-method-note">
          <p>
            ここで作るのは<strong>review PICO</strong>です。P・I・Cと研究デザインは適格基準へ、Oは通常は検索で必須にせず、抽出・統合計画へつなげます。
          </p>
          <p className="hint">
            根拠：<a href="https://training.cochrane.org/handbook/current/chapter-03" target="_blank" rel="noreferrer">Cochrane Handbook Chapter 3</a>、
            <a href="https://www.prisma-statement.org/prisma-2020" target="_blank" rel="noreferrer">PRISMA 2020</a>、
            <a href="https://systematicreviewsjournal.biomedcentral.com/articles/10.1186/s13643-020-01542-z" target="_blank" rel="noreferrer">PRISMA-S</a>
          </p>
        </div>
        <details className="sr-methodology-references">
          <summary>この作成手順の方法論参考文献（論文記載用）</summary>
          <ol>
            <li>
              McKenzie JE, Brennan SE, Ryan RE, Thomson HJ, Johnston RV, Thomas J. Chapter 3: Defining the criteria for including studies and how they will be grouped for the synthesis. In: Cochrane Handbook for Systematic Reviews of Interventions. Version 6.5. Cochrane; 2024. <a href="https://training.cochrane.org/handbook/current/chapter-03" target="_blank" rel="noreferrer">原典</a>
            </li>
            <li>
              Rethlefsen ML, Kirtley S, Waffenschmidt S, et al. PRISMA-S: an extension to the PRISMA Statement for Reporting Literature Searches in Systematic Reviews. Syst Rev. 2021;10:39. doi:10.1186/s13643-020-01542-z. <a href="https://doi.org/10.1186/s13643-020-01542-z" target="_blank" rel="noreferrer">原典</a>
            </li>
            <li>
              McGowan J, Sampson M, Salzwedel DM, Cogo E, Foerster V, Lefebvre C. PRESS Peer Review of Electronic Search Strategies: 2015 Guideline Statement. J Clin Epidemiol. 2016;75:40-46. doi:10.1016/j.jclinepi.2016.01.021. <a href="https://doi.org/10.1016/j.jclinepi.2016.01.021" target="_blank" rel="noreferrer">原典</a>
            </li>
            <li>
              Hoffmann TC, Glasziou PP, Boutron I, et al. Better reporting of interventions: template for intervention description and replication (TIDieR) checklist and guide. BMJ. 2014;348:g1687. doi:10.1136/bmj.g1687. <a href="https://doi.org/10.1136/bmj.g1687" target="_blank" rel="noreferrer">原典</a>
            </li>
          </ol>
        </details>

        <div className="form-group">
          <label htmlFor="sr-question">レビューの臨床疑問（自然な日本語でOK）</label>
          <textarea
            id="sr-question"
            rows={3}
            value={question}
            onChange={(event) => {
              onQuestionChange(event.target.value);
              resetAfterPico();
            }}
            placeholder="例：高齢の心不全患者にSGLT2阻害薬を追加すると、標準治療単独に比べて入院や死亡が減るか"
          />
        </div>
        <div className="form-group">
          <label htmlFor="sr-specialty">領域・診療科（任意）</label>
          <input
            id="sr-specialty"
            type="text"
            value={specialty}
            onChange={(event) => {
              setSpecialty(event.target.value);
              resetAfterPico();
            }}
            placeholder="例：循環器内科、口腔外科、疫学"
          />
        </div>

        <details className="pico-brainstorm-section">
          <summary>
            <strong>PICOが思いつかない場合：AIに案を考えてもらうプロンプトを生成</strong>
          </summary>
          <p className="hint">
            EBMタブの機能をそのままSR用PICO案Cに固定して配置しています。原質問と領域から一案を作り、AI回答を貼り付けると下のP/I/C/Oへ反映します。
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={generateBrainstormPrompt}
          >
            PICO案ブレストプロンプトを生成
          </button>
          {brainstormPrompt && (
            <>
              <PromptDisplay prompt={brainstormPrompt} title="SR用PICO案ブレストプロンプト" />
              <textarea
                rows={9}
                value={brainstormResponse}
                onChange={(event) => setBrainstormResponse(event.target.value)}
                placeholder="外部AIから返ってきた回答全体を貼り付け..."
              />
              <div className="step3-action">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={applyBrainstormPico}
                  disabled={!brainstormResponse.trim()}
                >
                  PICOを自動入力
                </button>
                <FeedbackLine feedback={brainstormFeedback} />
              </div>
            </>
          )}
          {!brainstormPrompt && <FeedbackLine feedback={brainstormFeedback} />}
        </details>

        <div className="sr-pico-input-grid">
          {(["p", "i", "c", "o"] as const).map((key) => (
            <label key={key} className={`sr-pico-input sr-pico-${key}`}>
              <strong>{key.toUpperCase()}</strong>
              {key === "p" && "（対象集団）"}
              {key === "i" && "（介入・曝露）"}
              {key === "c" && "（比較対照）"}
              {key === "o" && "（アウトカム）"}
              {(key === "p" || key === "i") && <span className="required">*</span>}
              <textarea
                rows={3}
                value={pico[key]}
                onChange={(event) => updatePico(key, event.target.value)}
              />
            </label>
          ))}
        </div>

        <div className="form-group">
          <label htmlFor="sr-known-pmids">
            キー論文のPMID（ある場合は必ず入力・回収確認用）
          </label>
          <div className="sr-key-paper-intro" role="note">
            <strong>
              キー論文とは、「最終検索式で必ず見つけたい」と事前に分かっている重要論文です。
            </strong>
            <p>
              領域の専門家が把握している代表的研究があれば、PMIDをここへ入力してください。
              司書・情報専門家へ検索式作成を依頼する場合も、依頼時にキー論文を共有することが重要です。
            </p>
            <p>
              キー論文を事前に特定できない領域もあります。その場合は無理に作らず空欄で進め、
              既存レビュー、引用追跡、専門家への確認から候補を探します。
            </p>
          </div>
          <textarea
            id="sr-known-pmids"
            rows={2}
            value={knownPmids}
            onChange={(event) => {
              onKnownPmidsChange(event.target.value);
              resetAfterPico();
            }}
            placeholder="例：33270928, 32865377"
          />
          {parsedKnownPmids.pmids.length > 0 && (
            <p className="hint known-pmid-valid">
              {parsedKnownPmids.pmids.length}件を検索後の回収確認に使います。
            </p>
          )}
          {parsedKnownPmids.invalidTokens.length > 0 && (
            <p className="date-range-error" role="alert">
              PMIDとして認識できない入力：{parsedKnownPmids.invalidTokens.join(" / ")}
            </p>
          )}
        </div>

        <button type="button" className="btn btn-primary" onClick={generateDefinitionPrompt}>
          定義・原典を検討するAIプロンプトを生成
        </button>
        <FeedbackLine feedback={!definitionPrompt ? definitionFeedback : null} />
      </section>

      {definitionPrompt && (
        <section className="workflow-section">
          <h2>Step 2：PICOの定義候補と原典を調べる</h2>
          <p className="hint">
            Web検索が使える外部AIへ貼り付けてください。定義論文、妥当性研究、診断・分類基準、ガイドライン、手術・処置の基本的方法論論文まで照合し、確認できない書誌を作らないよう指示しています。
          </p>
          <PromptDisplay prompt={definitionPrompt} title="定義・原典調査プロンプト" />
          <label className="sr-ai-response-label">
            AIの回答を貼り付け
            <textarea
              rows={12}
              value={definitionResponse}
              onChange={(event) => setDefinitionResponse(event.target.value)}
              placeholder="AI回答全体（DEFINITION_JSONブロックを含む）を貼り付け..."
            />
          </label>
          <div className="step3-action">
            <button
              type="button"
              className="btn btn-primary"
              onClick={applyDefinitionResponse}
              disabled={!definitionResponse.trim()}
            >
              定義候補を読み込む
            </button>
            <FeedbackLine feedback={definitionFeedback} />
          </div>
        </section>
      )}

      {consultation && (
        <section id="sr-definition-selection" className="workflow-section">
          <h2>Step 3：採用する定義・根拠を選ぶ</h2>
          <div className="sr-step3-guide" role="note">
            <p className="sr-step3-guide-lead">
              <strong>ここでは、次の適格基準作成に使う定義を人が決めます。</strong>
              AIが並べた候補をそのまま採用する画面ではありません。P・I・C・Oごとに、定義の範囲と根拠を確認して選びます。
            </p>
            <ol>
              <li>
                <strong>候補の中身を読む</strong>
                <span>
                  「定義」「操作的基準」「採用する理由」「限界・影響」を順に読み、実際のスクリーニングで同じ判定を再現できるか確認します。
                </span>
              </li>
              <li>
                <strong>採用する候補へチェックする</strong>
                <span>
                  PとIは最低1候補ずつ必要です。C・Oはレビュー課題に必要な場合だけ選びます。
                  複数候補を併用する場合は複数チェックし、1候補に決める場合は「この候補だけ採用」を使います。
                </span>
              </li>
              <li>
                <strong>原典を確認してから次へ進む</strong>
                <span>
                  「原典」リンクからPMID・DOI・対象集団・定義内容を確認します。必要なら定義文と操作的基準をこの画面で修正します。
                </span>
              </li>
            </ol>
            <div className="sr-step3-selection-meaning">
              <strong>チェックの意味：</strong>
              チェックした候補、その操作的基準、根拠文献だけが次の「適格基準作成プロンプト」へ渡ります。
              チェックを外した候補は次の工程に使われません。
            </div>
            <p className="sr-step3-ai-caution">
              「AI推奨候補」は比較を始めるための参考表示であり、妥当性や採用を保証するものではありません。
              根拠文献がない候補や「unverified」と表示された候補は、原典を確認できるまで採用しないでください。
            </p>
          </div>
          <SrDefinitionSelector
            consultation={consultation}
            onChange={handleConsultationChange}
          />
          <div className="sr-selection-action">
            <span>{selectedDefinitionCount}件を選択中</span>
            <button
              type="button"
              className="btn btn-primary"
              onClick={generateEligibilityPrompt}
              disabled={selectedDefinitionCount === 0}
            >
              選択定義から適格基準プロンプトを生成
            </button>
          </div>
          <FeedbackLine feedback={!eligibilityPrompt ? eligibilityFeedback : null} />
        </section>
      )}

      {eligibilityPrompt && (
        <section className="workflow-section">
          <h2>Step 4：スクリーニングに使える適格基準を作る</h2>
          <p className="hint">
            選択した定義だけを使い、タイトル・抄録／全文スクリーニングで再現可能な基準と、論文Methodsへ調整して使える文章を作らせます。
          </p>
          <PromptDisplay prompt={eligibilityPrompt} title="適格基準作成プロンプト" />
          <label className="sr-ai-response-label">
            AIの回答を貼り付け
            <textarea
              rows={12}
              value={eligibilityResponse}
              onChange={(event) => setEligibilityResponse(event.target.value)}
              placeholder="AI回答全体（ELIGIBILITY_JSONブロックを含む）を貼り付け..."
            />
          </label>
          <div className="step3-action">
            <button
              type="button"
              className="btn btn-primary"
              onClick={applyEligibilityResponse}
              disabled={!eligibilityResponse.trim()}
            >
              最終PICO・適格基準を読み込む
            </button>
            <FeedbackLine feedback={eligibilityFeedback} />
          </div>
        </section>
      )}

      {eligibility && (
        <section id="sr-final-eligibility" className="workflow-section">
          <h2>Step 5：最終PICO・適格基準を確認する</h2>
          <p className="hint">
            共同研究者への提示や論文草案への貼り付けに使えるよう、PICOと選択基準を一つの文書として表示します。修正が必要な場合だけ、下の個別編集欄を開いてください。
          </p>
          <SrEligibilitySummary
            criteria={eligibility}
            onChange={handleEligibilityChange}
            question={question}
          />
        </section>
      )}

      {(eligibility || (pico.p.trim() && pico.i.trim())) && (
      <section className="workflow-section">
        <h2>Step 6：既存SRの検索式を参考に、類義語候補を作る</h2>
        {!eligibility && (
          <div className="sr-bypass-note" role="note">
            推奨経路はStep 2〜5で適格基準を確定してから進む方法です。既にプロトコルがある場合は、現在のPICOから予備的な検索語作成へ進めます。
          </div>
        )}
        <label className="sr-existing-strategy-label">
          既存システマティックレビューの検索式（あれば入力／なくても空欄で進めます）
          <span className="hint">
            検索式が手元にない場合は、何も入力せず下の「類義語提案プロンプトを生成」を押してください。見つかっている場合だけ、データベース名、検索日、出典・DOI/PMIDと一緒に貼り付けてください。内容は盲目的に複製せず候補語として検証します。
          </span>
          <textarea
            rows={8}
            value={existingSearchStrategy}
            onChange={(event) => {
              setExistingSearchStrategy(event.target.value);
              resetAfterEligibility();
            }}
            placeholder="空欄でも進めます。既存SRの検索式がある場合だけ、出典・最終検索日と一緒に貼り付け..."
          />
        </label>
        <button
          type="button"
          className="btn btn-primary"
          onClick={generateSynonymPrompt}
          disabled={!pico.p.trim() || !pico.i.trim()}
        >
          類義語提案プロンプトを生成
        </button>
        <FeedbackLine feedback={!synonymPrompt ? synonymFeedback : null} />

        {synonymPrompt && (
          <div className="sr-synonym-roundtrip">
            <PromptDisplay prompt={synonymPrompt} title="検索語・類義語提案プロンプト" />
            <label className="sr-ai-response-label">
              AIの類義語回答を貼り付け
              <textarea
                rows={12}
                value={synonymResponse}
                onChange={(event) => setSynonymResponse(event.target.value)}
                placeholder="AI回答全体（SEARCH_ADVICEとTERMSブロックを含む）を貼り付け..."
              />
            </label>
            <div className="step3-action">
              <button
                type="button"
                className="btn btn-primary"
                onClick={applySynonymResponse}
                disabled={!synonymResponse.trim()}
              >
                類義語を検索テーブルへ反映
              </button>
              <FeedbackLine feedback={synonymFeedback} />
            </div>
          </div>
        )}
      </section>
      )}
    </>
  );
}
