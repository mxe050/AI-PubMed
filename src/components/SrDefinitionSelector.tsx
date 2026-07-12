import type {
  SrDefinitionConsultation,
  SrDefinitionElement,
  SrDefinitionOption,
  SrDefinitionSource,
} from "../utils/parseSrDefinitionResponse";

interface Props {
  consultation: SrDefinitionConsultation;
  onChange: (consultation: SrDefinitionConsultation) => void;
}

const ELEMENTS: Array<{
  key: SrDefinitionElement;
  label: string;
  className: string;
}> = [
  { key: "P", label: "P：対象集団の定義", className: "sr-definition-p" },
  { key: "I", label: "I：介入・曝露の定義", className: "sr-definition-i" },
  { key: "C", label: "C：比較対照の定義", className: "sr-definition-c" },
  { key: "O", label: "O：アウトカムの定義", className: "sr-definition-o" },
];

function sourceHref(source: SrDefinitionSource): string | null {
  if (/^https?:\/\//i.test(source.url)) return source.url;
  if (/^\d+$/.test(source.pmid)) {
    return `https://pubmed.ncbi.nlm.nih.gov/${source.pmid}/`;
  }
  if (source.doi) {
    const doi = source.doi.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "");
    return `https://doi.org/${encodeURI(doi)}`;
  }
  return null;
}

export function SrDefinitionSelector({ consultation, onChange }: Props) {
  function updateOption(id: string, patch: Partial<SrDefinitionOption>) {
    onChange({
      ...consultation,
      options: consultation.options.map((option) =>
        option.id === id ? { ...option, ...patch } : option
      ),
    });
  }

  function selectOnly(element: SrDefinitionElement, id: string) {
    onChange({
      ...consultation,
      options: consultation.options.map((option) =>
        option.element === element
          ? { ...option, selected: option.id === id }
          : option
      ),
    });
  }

  function clearElement(element: SrDefinitionElement) {
    onChange({
      ...consultation,
      options: consultation.options.map((option) =>
        option.element === element ? { ...option, selected: false } : option
      ),
    });
  }

  return (
    <div className="sr-definition-selector">
      {consultation.questionInterpretation && (
        <div className="sr-definition-interpretation">
          <strong>AIが解釈したレビュー疑問</strong>
          <p>{consultation.questionInterpretation}</p>
        </div>
      )}

      {consultation.decisionPoints.length > 0 && (
        <div className="sr-decision-points">
          <strong>定義を決める前に判断する点</strong>
          <ul>
            {consultation.decisionPoints.map((point, index) => (
              <li key={`${point}-${index}`}>{point}</li>
            ))}
          </ul>
        </div>
      )}

      {ELEMENTS.map((element) => {
        const options = consultation.options.filter(
          (option) => option.element === element.key
        );
        if (options.length === 0) return null;
        return (
          <section
            className={`sr-definition-group ${element.className}`}
            key={element.key}
          >
            <div className="sr-definition-group-heading">
              <h4>{element.label}</h4>
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                onClick={() => clearElement(element.key)}
              >
                この要素を全解除
              </button>
            </div>

            <div className="sr-definition-card-list">
              {options.map((option) => (
                <article
                  key={option.id}
                  className={`sr-definition-card ${option.selected ? "selected" : ""}`}
                >
                  <div className="sr-definition-card-heading">
                    <label>
                      <input
                        type="checkbox"
                        checked={option.selected}
                        onChange={(event) =>
                          updateOption(option.id, { selected: event.target.checked })
                        }
                      />
                      <span className="sr-definition-id">{option.id}</span>
                      <strong>{option.title}</strong>
                    </label>
                    {option.recommended && (
                      <span className="sr-recommended-badge">AI推奨候補</span>
                    )}
                  </div>

                  <label className="sr-definition-edit-label">
                    定義（採用前に編集できます）
                    <textarea
                      rows={3}
                      value={option.definition}
                      onChange={(event) =>
                        updateOption(option.id, { definition: event.target.value })
                      }
                    />
                  </label>

                  <label className="sr-definition-edit-label">
                    操作的基準（1行1基準）
                    <textarea
                      rows={Math.max(2, option.operationalCriteria.length)}
                      value={option.operationalCriteria.join("\n")}
                      onChange={(event) =>
                        updateOption(option.id, {
                          operationalCriteria: event.target.value
                            .split(/\r?\n/)
                            .map((line) => line.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  </label>

                  {option.rationale && (
                    <p className="sr-definition-rationale">
                      <strong>採用する理由：</strong>{option.rationale}
                    </p>
                  )}
                  {option.limitations.length > 0 && (
                    <div className="sr-definition-limitations">
                      <strong>限界・影響：</strong>
                      <ul>
                        {option.limitations.map((limitation, index) => (
                          <li key={`${limitation}-${index}`}>{limitation}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="sr-definition-sources">
                    <strong>根拠文献</strong>
                    {option.sources.length === 0 ? (
                      <p className="filter-caution">
                        書誌を照合できた根拠がありません。この候補は採用前に原典確認が必要です。
                      </p>
                    ) : (
                      <ol>
                        {option.sources.map((source, index) => {
                          const href = sourceHref(source);
                          return (
                            <li key={`${option.id}-source-${index}`}>
                              {source.citation || "書誌情報なし"}
                              {href && (
                                <>{" "}<a href={href} target="_blank" rel="noreferrer">原典</a></>
                              )}
                              <span
                                className={`sr-source-verification ${
                                  /unverified|未確認/i.test(source.verifiedWith)
                                    ? "unverified"
                                    : ""
                                }`}
                              >
                                照合先: {source.verifiedWith || "unverified"}
                              </span>
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    onClick={() => selectOnly(element.key, option.id)}
                  >
                    この候補だけ採用
                  </button>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
