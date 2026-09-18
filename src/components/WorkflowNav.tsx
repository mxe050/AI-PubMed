import { ArrowDown, Check } from "lucide-react";
import { focusSection } from "../utils/focusSection";

export interface WorkflowStep {
  id: string;
  label: string;
  available: boolean;
}

export function WorkflowNav({
  steps, current, nextAction, label,
}: {
  steps: WorkflowStep[];
  current: string;
  nextAction: string;
  label: string;
}) {
  const currentIndex = steps.findIndex((step) => step.id === current);
  return (
    <nav className="workflow-navigator" aria-label={label}>
      <ol>
        {steps.map((step, index) => (
          <li key={step.id}>
            <button
              type="button"
              disabled={!step.available}
              aria-current={step.id === current ? "step" : undefined}
              onClick={() => focusSection(step.id)}
              title={step.available ? `${step.label}へ移動` : "前のステップから進んでください"}
            >
              <span className="workflow-step-number" aria-hidden="true">
                {step.available && index < currentIndex ? <Check size={14} /> : index + 1}
              </span>
              {step.label}
            </button>
          </li>
        ))}
      </ol>
      <button className="workflow-next-action" type="button" onClick={() => focusSection(current)}>
        <ArrowDown size={16} aria-hidden="true" />
        <span><strong>次にすること</strong> {nextAction}</span>
      </button>
    </nav>
  );
}
