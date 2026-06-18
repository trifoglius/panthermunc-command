export interface RuleOfProcedure {
  number: number;
  title: string;
  body: string;
}

export function ruleAnchorId(number: number): string {
  return `rule-${number}`;
}

export function parseRulesOfProcedure(text: string): RuleOfProcedure[] {
  const rules: RuleOfProcedure[] = [];
  let current: RuleOfProcedure | null = null;

  for (const line of text.split("\n")) {
    const match = line.match(/^Rule (\d+)\.\s+(.+)$/);
    if (match) {
      if (current) rules.push(current);
      current = {
        number: Number.parseInt(match[1], 10),
        title: match[2].trim(),
        body: "",
      };
      continue;
    }

    if (current && line.trim()) {
      current.body += (current.body ? "\n" : "") + line;
    }
  }

  if (current) rules.push(current);
  return rules;
}

export function filterRules(
  rules: RuleOfProcedure[],
  query: string
): RuleOfProcedure[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return rules;

  return rules.filter((rule) => {
    const haystack = `rule ${rule.number} ${rule.title} ${rule.body}`.toLowerCase();
    return haystack.includes(trimmed);
  });
}
