import { Rule } from '../../rules/rules.schema';
import { RuleEvalMode } from '../../site/site.schema';

export function sortRules(rules: Rule[], mode: RuleEvalMode): Rule[] {
  // Create a copy to sort
  const sorted = [...rules];

  if (mode === 'PRIORITY') {
    // PRIORITY Mode: Sort by explicit priority ASC (lower number wins)
    // Zod enforces priority exists for this mode
    sorted.sort((a, b) => {
      const pA = a.priority ?? Infinity;
      const pB = b.priority ?? Infinity;
      return Number.isNaN(pA - pB) ? 0 : pA - pB;
    });
    return sorted;
  }

  // SPECIFICITY Mode
  // Primary: Conditions count DESC
  // Secondary: Priority ASC (if provided)
  sorted.sort((a, b) => {
    const aCount = Object.keys(a.conditions).length;
    const bCount = Object.keys(b.conditions).length;

    // 1. Specificity (more conditions = higher specificity = lower index)
    if (aCount !== bCount) {
      return bCount - aCount;
    }

    // 2. Tiebreaker: Priority
    const pA = a.priority ?? Infinity;
    const pB = b.priority ?? Infinity;
    if (pA !== pB) {
      return pA - pB;
    }

    // 3. Stable sort order (retained implicitly by Array.prototype.sort in modern V8)
    return 0;
  });

  return sorted;
}
