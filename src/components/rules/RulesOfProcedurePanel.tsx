"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, Input } from "@/components/ui";
import {
  filterRules,
  parseRulesOfProcedure,
  ruleAnchorId,
  type RuleOfProcedure,
} from "@/lib/rules-of-procedure";

function scrollToRule(number: number) {
  document.getElementById(ruleAnchorId(number))?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const trimmed = query.trim();
  if (!trimmed) return <>{text}</>;

  const lowerText = text.toLowerCase();
  const lowerQuery = trimmed.toLowerCase();
  const parts: React.ReactNode[] = [];
  let start = 0;
  let index = lowerText.indexOf(lowerQuery);

  while (index !== -1) {
    if (index > start) parts.push(text.slice(start, index));
    parts.push(
      <mark
        key={`${index}-${lowerQuery}`}
        className="rounded bg-yellow-200 px-0.5 text-purple-950"
      >
        {text.slice(index, index + trimmed.length)}
      </mark>
    );
    start = index + trimmed.length;
    index = lowerText.indexOf(lowerQuery, start);
  }

  if (start < text.length) parts.push(text.slice(start));
  return <>{parts}</>;
}

function RuleBlock({ rule, query }: { rule: RuleOfProcedure; query: string }) {
  return (
    <section
      id={ruleAnchorId(rule.number)}
      className="scroll-mt-24 rounded-lg border border-purple-100 bg-white p-4"
    >
      <h3 className="text-lg font-semibold text-purple-900">
        Rule {rule.number}.{" "}
        <HighlightedText text={rule.title} query={query} />
      </h3>
      <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-purple-800">
        <HighlightedText text={rule.body} query={query} />
      </div>
    </section>
  );
}

export function RulesOfProcedurePanel() {
  const [query, setQuery] = useState("");
  const [rules, setRules] = useState<RuleOfProcedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/rulesofprocedure.txt")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Could not load rules of procedure.");
        }
        return response.text();
      })
      .then((text) => {
        if (cancelled) return;
        setRules(parseRulesOfProcedure(text));
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(
          error instanceof Error ? error.message : "Could not load rules of procedure."
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRules = useMemo(
    () => filterRules(rules, query),
    [rules, query]
  );

  if (loading) {
    return (
      <Card title="Rules of Procedure">
        <p className="text-sm text-purple-700">Loading rules of procedure...</p>
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card title="Rules of Procedure">
        <p className="text-sm text-red-700">{loadError}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card title="Rules of Procedure">
        <p className="mb-3 text-sm text-purple-700">
          PantherMUNC committee rules. Use quick links to jump to a rule, or
          search by keyword, rule number, or motion name.
        </p>
        <Input
          label="Search rules"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. quorum, caucus, voting, Rule 12"
        />
      </Card>

      <Card title="Quick Links">
        {filteredRules.length === 0 ? (
          <p className="text-sm text-purple-600">No rules match your search.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {filteredRules.map((rule) => (
              <button
                key={rule.number}
                type="button"
                onClick={() => scrollToRule(rule.number)}
                className="rounded-md border border-purple-200 bg-purple-50 px-3 py-1.5 text-left text-sm text-purple-900 transition-colors hover:bg-purple-100"
                title={rule.title}
              >
                <span className="font-semibold">Rule {rule.number}</span>
                <span className="text-purple-700"> · {rule.title}</span>
              </button>
            ))}
          </div>
        )}
      </Card>

      <div className="space-y-4">
        {filteredRules.map((rule) => (
          <RuleBlock key={rule.number} rule={rule} query={query} />
        ))}
      </div>
    </div>
  );
}
