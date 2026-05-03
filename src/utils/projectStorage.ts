import type { SearchProject } from "../types";
import { STORAGE_KEYS } from "../types";

export function loadProjects(): SearchProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.projects);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveProjects(projects: SearchProject[]): void {
  localStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(projects));
}

export function createProject(
  partial: Pick<SearchProject, "strategyType" | "title" | "inputData">
): SearchProject {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    strategyType: partial.strategyType,
    title: partial.title,
    inputData: partial.inputData,
    promptRuns: [],
    searchStrings: [],
    pubmedResults: [],
    notes: "",
    createdAt: now,
    updatedAt: now,
  };
}
