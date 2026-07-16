import { useMemo, useState } from "react";
import { buildPrompt } from "../utils/buildPrompt";
import {
  srEligibilityPrompt,
  srPicoBrainstormPrompt,
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
import type { SrPopulationMode } from "../utils/srPopulation";

export interface SrPicoValue {
  p: string;
  populationMode: SrPopulationMode;
  p1: string;
  p2: string;
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
  /** 検索語テーブルが表示され、Step 7へ到達しているか。 */
  searchReady: boolean;
}

type Feedback = { kind: "ok" | "error"; text: string } | null;

const WORKFLOW_STEPS = [
  { number: 1, label: "疑問・PICO" },
  { number: 2, label: "定義調査" },
  { number: 3, label: "定義選択" },
  { number: 4, label: "適格基準" },
  { number: 5, label: "基準確認" },
  { number: 6, label: "類義語" },
  { number: 7, label: "検索・検証" },
] as const;

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
  searchReady,
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
  const [eligibilityBypassOpen, setEligibilityBypassOpen] = useState(false);

  const parsedKnownPmids = useMemo(
    () => parseKnownPmids(knownPmids),
    [knownPmids]
  );
  const selectedDefinitionCount =
    consultation?.options.filter((option) => option.selected).length ?? 0;
  const currentStep = searchReady
    ? 7
    : synonymPrompt || eligibilityBypassOpen
      ? 6
      : eligibility
        ? 5
        : eligibilityPrompt
          ? 4
          : consultation
            ? 3
            : definitionPrompt
              ? 2
              : 1;

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
    setEligibilityBypassOpen(false);
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
    setEligibilityBypassOpen(false);
    onSearchInputsChanged();
  }

  function resetAfterEligibility() {
    setSynonymPrompt("");
    setSynonymResponse("");
    setSynonymFeedback(null);
    onSearchInputsChanged();
  }

  function updatePico(
    key: "p" | "p1" | "p2" | "i" | "c" | "o",
    value: string
  ) {
    onPicoChange({ ...pico, [key]: value });
    resetAfterPico();
  }

  function updatePopulationMode(populationMode: SrPopulationMode) {
    onPicoChange({
      ...pico,
      populationMode,
      p1:
        populationMode === "multiple"
          ? pico.p1 || pico.p
          : pico.p || pico.p1,
      p2: populationMode === "multiple" ? pico.p2 : "",
    });
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
      buildPrompt(srPicoBrainstormPrompt, {
        question,
        specialty: specialty || "未入力",
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
      populationMode: result.pico.populationMode,
      p1: result.pico.p1 || result.pico.p || pico.p1,
      p2:
        result.pico.populationMode === "multiple"
          ? result.pico.p2 || pico.p2
          : "",
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
    if (
      pico.populationMode === "multiple" &&
      (!pico.p1.trim() || !pico.p2.trim())
    ) {
      setDefinitionFeedback({
        kind: "error",
        text: "複合Pを選んだ場合は、P1とP2を両方入力してください。",
      });
      return;
    }
    setDefinitionPrompt(
      buildPrompt(srPicoDefinitionPrompt, {
        question,
        specialty: specialty || "未入力",
        p: pico.p,
        populationMode: pico.populationMode,
        p1: pico.populationMode === "multiple" ? pico.p1 : pico.p,
        p2: pico.populationMode === "multiple" ? pico.p2 : "該当なし",
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
    const missingSplitDefinitions =
      pico.populationMode === "multiple" &&
      (!result.consultation.options.some((option) => option.element === "P1") ||
        !result.consultation.options.some((option) => option.element === "P2"));
    setDefinitionFeedback({
      kind: missingSplitDefinitions ? "error" : "ok",
      text: `${result.consultation.options.length}件の定義候補を読み込みました。${
        result.warnings.length ? ` 確認事項：${result.warnings.join(" / ")}` : ""
      }${
        missingSplitDefinitions
          ? " 複合PですがP1またはP2の定義候補が不足しています。AI回答を再確認してください。"
          : ""
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
    const selectedP =
      pico.populationMode === "multiple"
        ? consultation.options.some(
            (option) => option.element === "P1" && option.selected
          ) &&
          consultation.options.some(
            (option) => option.element === "P2" && option.selected
          )
        : consultation.options.some(
            (option) => option.element === "P" && option.selected
          );
    const selectedI = consultation.options.some(
      (option) => option.element === "I" && option.selected
    );
    if (!selectedP || !selectedI) {
      setEligibilityFeedback({
        kind: "error",
        text:
          pico.populationMode === "multiple"
            ? "P1・P2・Iから、それぞれ1件以上の定義候補を選択してください。"
            : "最低限、PとIから各1件以上の定義候補を選択してください。",
      });
      return;
    }
    setEligibilityPrompt(
      buildPrompt(srEligibilityPrompt, {
        question,
        p: pico.p,
        populationMode: pico.populationMode,
        p1: pico.populationMode === "multiple" ? pico.p1 : pico.p,
        p2: pico.populationMode === "multiple" ? pico.p2 : "",
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
      populationMode: pico.populationMode,
      p1:
        pico.populationMode === "multiple"
          ? result.criteria.p1 || pico.p1
          : result.criteria.p || pico.p,
      p2:
        pico.populationMode === "multiple"
          ? result.criteria.p2 || pico.p2
          : "",
      sourceOptionIds:
        consultation?.options
          .filter((option) => option.selected)
          .map((option) => option.id) ?? result.criteria.sourceOptionIds,
      definitionReferences: trustedReferences,
    };
    setEligibility(trustedCriteria);
    onPicoChange({
      p: trustedCriteria.p,
      populationMode: trustedCriteria.populationMode,
      p1: trustedCriteria.p1,
      p2: trustedCriteria.p2,
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
    onPicoChange({
      p: next.p,
      populationMode: next.populationMode,
      p1: next.p1,
      p2: next.p2,
      i: next.i,
      c: next.c,
      o: next.o,
    });
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
    if (
      pico.populationMode === "multiple" &&
      (!pico.p1.trim() || !pico.p2.trim())
    ) {
      setSynonymFeedback({
        kind: "error",
        text: "複合Pの検索語を作るには、P1とP2を両方入力してください。",
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
        populationMode: pico.populationMode,
        p1: pico.populationMode === "multiple" ? pico.p1 : pico.p,
        p2: pico.populationMode === "multiple" ? pico.p2 : "該当なし",
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
        <div className="sr-workflow-map-heading">
          <strong>現在地</strong>
          <span>Step {currentStep} / 7</span>
        </div>
        <ol>
          {WORKFLOW_STEPS.map((step) => {
            const state =
              step.number < currentStep
                ? "completed"
                : step.number === currentStep
                  ? "current"
                  : "upcoming";
            return (
              <li
                key={step.number}
                className={`sr-workflow-${state}`}
                aria-current={state === "current" ? "step" : undefined}
              >
                <span aria-hidden="true">
                  {state === "completed" ? "✓" : step.number}
                </span>
                <small>{step.label}</small>
              </li>
            );
          })}
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

        <details className="pico-brainstorm-section" open>
          <summary>
            <strong>PICOが思いつかない場合：AIに案を考えてもらうプロンプトを生成</strong>
          </summary>
          <p className="hint">
            原質問と領域からSR用PICO案を1つ作ります。Pに複数の条件がある場合はP1・P2の候補も整理し、AI回答を貼り付けると下のP/I/C/OとPの構造へ反映します。
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
                aria-describedby={
                  key === "p" ? "sr-complex-population-summary" : undefined
                }
              />
              {key === "p" && (
                <small className="sr-pico-inline-caution">
                  「〇〇を伴う××」のように条件が複数ある場合は、下でP1・P2に整理できます。
                </small>
              )}
            </label>
          ))}
        </div>

        <div className="sr-population-structure-card" role="group" aria-labelledby="sr-population-structure-title">
          <div className="sr-population-structure-heading">
            <div>
              <strong id="sr-population-structure-title">Pの中に、別々に定義したい条件がありますか？</strong>
              <p>迷う場合は、上のPICO案プロンプトでAIに候補を整理させてから選べます。</p>
            </div>
            <div className="sr-population-mode-buttons" role="radiogroup" aria-label="Pの構造">
              <button
                type="button"
                role="radio"
                aria-checked={pico.populationMode === "single"}
                className={`btn btn-secondary ${pico.populationMode === "single" ? "active" : ""}`}
                onClick={() => updatePopulationMode("single")}
              >
                Pは1つの概念
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={pico.populationMode === "multiple"}
                className={`btn btn-secondary ${pico.populationMode === "multiple" ? "active" : ""}`}
                onClick={() => updatePopulationMode("multiple")}
              >
                Pに2つの条件がある
              </button>
            </div>
          </div>

          {pico.populationMode === "multiple" && (
            <div className="sr-population-split-grid">
              <label>
                <strong>P1：主となる集団・疾患</strong>
                <span>研究が主にどの患者・疾患を対象としているか</span>
                <textarea
                  rows={3}
                  value={pico.p1}
                  onChange={(event) => updatePico("p1", event.target.value)}
                  placeholder="例：2型糖尿病患者"
                />
              </label>
              <label>
                <strong>P2：追加条件・特性</strong>
                <span>P1に加えて必要な併存状態・特性・サブグループ</span>
                <textarea
                  rows={3}
                  value={pico.p2}
                  onChange={(event) => updatePico("p2", event.target.value)}
                  placeholder="例：肥満を有する"
                />
              </label>
              <div className="sr-population-split-reminder" role="note">
                <strong>P1・P2は「別の概念」です。</strong>
                同義語や略語はここで分けず、Step 6の各検索語ブロック内でORにまとめます。
                P1のみを使うか、P1とP2をOR／ANDで結ぶかは、検索語を確認した後のStep 7で選びます。
              </div>
            </div>
          )}
        </div>

        <details className="sr-complex-population-note">
          <summary id="sr-complex-population-summary">
            <span aria-hidden="true">⚠</span>
            <span className="sr-complex-population-summary-copy">
              <span>Pに複数の条件が含まれる場合：単純なAND検索による見落としに注意</span>
              <small>該当する場合は、見出しをクリックして内容を読んでください。</small>
            </span>
          </summary>
          <div className="sr-complex-population-body">
            <p className="sr-complex-population-example">
              <strong>例：肥満を有する糖尿病患者</strong>
            </p>
            <p>
              このPには「肥満」と「糖尿病」という2つの条件があります。検索式を単純に
              <code>肥満 AND 糖尿病</code>
              とすると、糖尿病治療の研究で、肥満の有無が本文中のサブグループ解析としてだけ報告され、
              タイトル・抄録・索引に「肥満」が十分記載されていない研究が検索結果から外れる可能性があります。
            </p>
            <p>
              この場合、P全体は「肥満を有する糖尿病患者」のまま適格基準として保持し、検索概念だけを
              P1「糖尿病」とP2「肥満」に分けます。P1/P2へ分けることは、適格基準を緩めることではありません。
            </p>
            <div className="sr-complex-population-policy" role="note">
              <strong>P1のみ・OR・ANDは、目的と見落としの可能性が異なります</strong>
              <ul>
                <li><strong>P1のみ：</strong>P2を検索式へ入れず、P2は適格基準とスクリーニングで確認します。P2が書誌情報に現れにくい場合の見落としを避けやすくなります。</li>
                <li><strong>P1 AND P2：</strong>両方が書誌情報に現れる文献へ絞れますが、P2が本文だけにある研究を落とす可能性があります。</li>
                <li><strong>P1 OR P2：</strong>一方しか書誌情報にない研究も拾いやすくなりますが、無関係文献が大きく増えることがあります。</li>
              </ul>
            </div>
            <h4>P1・P2を決める順序</h4>
            <ol>
              <li>
                <strong>Step 1：</strong>P1を主となる集団・疾患、P2を追加条件・特性として仮置きします。
                年齢・重症度・病期・診療場面を機械的にP2へせず、レビュー目的に不可欠か確認します。
              </li>
              <li>
                <strong>Step 2〜5：</strong>P1/P2それぞれの定義・閾値・根拠を確認し、一部だけ適格な参加者、
                混合集団、分離できるサブグループデータをどう扱うか事前に決めます。
              </li>
              <li>
                <strong>Step 6〜7：</strong>P1/P2の類義語を別々に作り、P1のみ・OR版・AND版をPubMedで比較します。
                件数、Details／Warnings、キー論文の回収、無関係文献の原因を確認して人が選びます。
              </li>
              <li>
                採用した結合方法、その理由、比較した検索日・件数・キー論文の結果をプロトコルと検索記録に残します。
              </li>
            </ol>
            <p className="hint sr-complex-population-sources">
              方法論の確認：
              <a href="https://training.cochrane.org/handbook/current/chapter-03" target="_blank" rel="noreferrer">
                Cochrane Handbook Chapter 3
              </a>
              （対象集団・部分的に適格な参加者）／
              <a href="https://training.cochrane.org/handbook/current/chapter-04" target="_blank" rel="noreferrer">
                Chapter 4
              </a>
              （検索概念を増やしすぎず感度を保つ考え方）
            </p>
          </div>
        </details>

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
            {pico.populationMode === "multiple" &&
              " P1とP2は別々に調査し、混合集団・本文中のサブグループ・分離データの扱いも検討します。"}
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
              AIが並べた候補をそのまま採用する画面ではありません。
              {pico.populationMode === "multiple" ? "P1・P2・I・C・O" : "P・I・C・O"}
              ごとに、定義の範囲と根拠を確認して選びます。
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
                  {pico.populationMode === "multiple"
                    ? "P1・P2・Iは最低1候補ずつ必要です。"
                    : "PとIは最低1候補ずつ必要です。"}
                  C・Oはレビュー課題に必要な場合だけ選びます。
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
            {pico.populationMode === "multiple" &&
              " P1・P2の両条件、一部だけ適格な集団、サブグループデータの扱いも文章化します。"}
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
            {pico.populationMode === "multiple" &&
              " P全体とP1/P2の定義が意図どおり対応しているか確認してください。"}
          </p>
          <SrEligibilitySummary
            criteria={eligibility}
            onChange={handleEligibilityChange}
            question={question}
          />
        </section>
      )}

      {!eligibility &&
        pico.p.trim() &&
        pico.i.trim() &&
        !eligibilityBypassOpen && (
          <aside className="sr-advanced-start sr-eligibility-bypass">
            <details>
              <summary>適格基準が既に確定している方（上級者向け）</summary>
              <p>
                通常はStep 2〜5で定義と適格基準を確定します。別のプロトコルで基準が確定済みの場合だけ、暫定PICOからStep 6の類義語作成へ進めます。
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setEligibilityBypassOpen(true)}
              >
                Step 6の類義語作成を開く
              </button>
            </details>
          </aside>
        )}

      {(eligibility || eligibilityBypassOpen) && (
      <section className="workflow-section">
        <h2>
          Step 6：{pico.populationMode === "multiple" ? "P1・P2を分けて、" : ""}
          類義語候補を作る
        </h2>
        {pico.populationMode === "multiple" && (
          <div className="sr-population-step6-note" role="note">
            <strong>この段階ではP1とP2を混ぜません。</strong>
            AIには各概念のMeSH・自由語を別々に出させます。各ブロック内の類義語はORでまとめ、
            P1のみを使うか、P1とP2をOR／ANDで結ぶかは、Step 7であなたが選びます。
          </div>
        )}
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
          disabled={
            !pico.p.trim() ||
            !pico.i.trim() ||
            (pico.populationMode === "multiple" &&
              (!pico.p1.trim() || !pico.p2.trim()))
          }
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
