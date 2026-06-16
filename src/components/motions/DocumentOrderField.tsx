"use client";

import { useState } from "react";
import { Button, Select } from "@/components/ui";
import {
  parseDocumentOrder,
  serializeDocumentOrder,
} from "@/lib/voting";
import type { Document } from "@/lib/types";

export function DocumentOrderField({
  label,
  value,
  onChange,
  documents,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  documents: Document[];
}) {
  const orderedIds = parseDocumentOrder(value);
  const [addId, setAddId] = useState("");

  const available = documents.filter((d) => !orderedIds.includes(d.id));

  const addDocument = () => {
    if (!addId || orderedIds.includes(addId)) return;
    onChange(serializeDocumentOrder([...orderedIds, addId]));
    setAddId("");
  };

  const removeDocument = (id: string) => {
    onChange(serializeDocumentOrder(orderedIds.filter((docId) => docId !== id)));
  };

  const moveDocument = (index: number, direction: -1 | 1) => {
    const next = [...orderedIds];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(serializeDocumentOrder(next));
  };

  return (
    <div className="rounded-md border border-purple-100 p-3">
      <p className="mb-2 text-sm font-medium text-purple-900">{label}</p>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <Select
          label="Add draft resolution"
          value={addId}
          onChange={(e) => setAddId(e.target.value)}
          options={[
            { value: "", label: "Select..." },
            ...available.map((d) => ({ value: d.id, label: d.title })),
          ]}
          className="min-w-48"
        />
        <Button onClick={addDocument} disabled={!addId} size="sm">
          Add
        </Button>
      </div>
      {orderedIds.length === 0 ? (
        <p className="text-sm text-purple-600">No documents added yet.</p>
      ) : (
        <ol className="space-y-2">
          {orderedIds.map((id, index) => {
            const doc = documents.find((d) => d.id === id);
            return (
              <li
                key={id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-purple-100 px-3 py-2"
              >
                <span className="text-sm text-purple-900">
                  <span className="mr-2 font-medium text-purple-600">
                    {index + 1}.
                  </span>
                  {doc?.title ?? "Unknown document"}
                </span>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => moveDocument(index, -1)}
                    disabled={index === 0}
                  >
                    ↑
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => moveDocument(index, 1)}
                    disabled={index === orderedIds.length - 1}
                  >
                    ↓
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeDocument(id)}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
