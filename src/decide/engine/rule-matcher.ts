/**
 * Evaluates whether a rule's conditions match the provided context.
 * A rule matches if ALL its conditions equal the corresponding values in the context.
 * 
 * Future: Use ts-pattern or custom operators (gt, lt, in) for more complex logic.
 */
export function matchRule(
  conditions: Record<string, string>,
  context: Record<string, any>,
): boolean {
  // Empty conditions object always matches (fallback rule)
  const conditionEntries = Object.entries(conditions);
  if (conditionEntries.length === 0) {
    return true;
  }

  // ALL conditions must be satisfied
  return conditionEntries.every(([key, value]) => {
    // Handle nested dot-notation paths (e.g. "segments.tier")
    const contextValue = getNestedValue(context, key);
    
    // Strict string equality for now
    // Future: parse value for operators like {"country": {"$in": ["DE", "FR"]}}
    return String(contextValue) === value;
  });
}

/**
 * Helper to resolve nested object paths like "segments.tier"
 */
function getNestedValue(obj: any, path: string): any {
  if (!obj || typeof obj !== 'object') return undefined;
  
  // If the flat key exists (which is how we merge datasource outputs), use it
  if (path in obj) {
    return obj[path];
  }

  // Fallback to true path traversal
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[key];
  }
  
  return current;
}
