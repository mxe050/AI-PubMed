import { useState } from "react";
import type { AppSettings } from "../types";
import {
  gradePromptMap,
  gradeSubStrategies,
  gradeFields,
} from "../prompts/gradeAdolopment";
import type { GradeSubStrategy } from "../prompts/gradeAdolopment";
import { StrategyWorkflow } from "./StrategyWorkflow";

interface Props {
  settings: AppSettings;
}

export function GradeTab({ settings }: Props) {
  const [subStrategy, setSubStrategy] = useState<GradeSubStrategy>("source_guideline");

  const template = gradePromptMap[subStrategy];
  const current = gradeSubStrategies.find((s) => s.key === subStrategy);

  return (
    <div className="grade-tab">
      <div className="sub-strategy-selector">
        <h3>サブ戦略を選択</h3>
        <div className="sub-strategy-buttons">
          {gradeSubStrategies.map((s) => (
            <button
              key={s.key}
              className={`btn ${subStrategy === s.key ? "btn-active" : "btn-outline"}`}
              onClick={() => setSubStrategy(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
        {current && (
          <p className="hint">{current.description}</p>
        )}
      </div>

      <StrategyWorkflow
        key={subStrategy}
        settings={settings}
        fields={gradeFields}
        promptTemplate={template}
        description={`GRADE-ADOLOPMENT: ${current?.label ?? subStrategy}`}
        mode="grade-revision"
      />
    </div>
  );
}
