import type { Conference } from "./types";

const STORAGE_KEY = "panthermunc-conference-data";

export function loadConference(): Conference | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Conference;
  } catch {
    return null;
  }
}

export function saveConference(conference: Conference): void {
  if (typeof window === "undefined") return;
  conference.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conference));
}

export function exportConferenceJson(conference: Conference): void {
  const blob = new Blob([JSON.stringify(conference, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `panthermunc-${conference.year}-backup.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importConferenceJson(file: File): Promise<Conference> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result as string) as Conference);
      } catch {
        reject(new Error("Invalid JSON file"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}
