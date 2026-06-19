import type { TemplateId, TemplateInfo } from "../types";
import type { ComponentType } from "react";

export const TEMPLATES: TemplateInfo[] = [
  { id: "classic", name: "Classic", tier: "ats-safe", description: "Clean serif layout, single column" },
  { id: "modern", name: "Modern", tier: "ats-safe", description: "Clean sans-serif with accent bar" },
  { id: "compact", name: "Compact", tier: "ats-safe", description: "Tight spacing, fits 1 page" },
  { id: "minimal", name: "Minimal", tier: "ats-safe", description: "Ultra-compact, small footprint" },
  { id: "professional", name: "Professional", tier: "ats-safe", description: "Structured header, numbered sections" },
  { id: "split", name: "Split", tier: "designer", description: "Two-column with sidebar (may not be fully ATS-safe)" },
];

export const ACCENT_COLORS = [
  { name: "Indigo", value: "#4f46e5" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Green", value: "#16a34a" },
  { name: "Teal", value: "#0d9488" },
  { name: "Rose", value: "#e11d48" },
  { name: "Slate", value: "#475569" },
] as const;

import { ClassicTemplate as ClassicTpl } from "./ClassicTemplate";
import { ModernTemplate as ModernTpl } from "./ModernTemplate";
import { CompactTemplate as CompactTpl } from "./CompactTemplate";
import { MinimalTemplate as MinimalTpl } from "./MinimalTemplate";
import { ProfessionalTemplate as ProfessionalTpl } from "./ProfessionalTemplate";
import { SplitTemplate as SplitTpl } from "./SplitTemplate";

export const ClassicTemplate = ClassicTpl;
export const ModernTemplate = ModernTpl;
export const CompactTemplate = CompactTpl;
export const MinimalTemplate = MinimalTpl;
export const ProfessionalTemplate = ProfessionalTpl;
export const SplitTemplate = SplitTpl;

export function getTemplateComponent(id: TemplateId) {
  const map: Record<TemplateId, ComponentType<any>> = {
    classic: ClassicTpl,
    modern: ModernTpl,
    compact: CompactTpl,
    minimal: MinimalTpl,
    professional: ProfessionalTpl,
    split: SplitTpl,
  };
  return map[id];
}
