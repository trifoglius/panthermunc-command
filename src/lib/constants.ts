export interface MotionFieldOption {
  value: string;
  label: string;
}

export interface MotionFieldShowWhen {
  field: string;
  value: string;
}

export interface MotionField {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "document_select" | "document_order";
  options?: MotionFieldOption[];
  showWhen?: MotionFieldShowWhen;
}

export const MOTION_TYPES: {
  id: string;
  label: string;
  fields: MotionField[];
}[] = [
  {
    id: "moderated_caucus",
    label: "Motion for Moderated Caucus",
    fields: [
      { key: "topic", label: "Topic", type: "text" },
      { key: "duration", label: "Total duration (min)", type: "text" },
      { key: "speaking_time", label: "Speaking time (sec)", type: "text" },
    ],
  },
  {
    id: "suspend_meeting",
    label: "Motion to Suspend the Meeting",
    fields: [{ key: "duration", label: "Duration (min)", type: "text" }],
  },
  {
    id: "change_speaking_time",
    label: "Motion to Change Speaking Time",
    fields: [
      { key: "speaking_time", label: "New speaking time (sec)", type: "text" },
    ],
  },
  {
    id: "division_question",
    label: "Motion for Division of the Question",
    fields: [
      {
        key: "document_id",
        label: "Proposal",
        type: "document_select",
      },
      {
        key: "parts",
        label: "Parts (one per line or semicolon-separated)",
        type: "textarea",
      },
    ],
  },
  {
    id: "competence",
    label: "Motion on Competence of the Committee",
    fields: [
      {
        key: "document_id",
        label: "Proposal",
        type: "document_select",
      },
    ],
  },
];

export const VOTE_MODES = [
  { value: "consensus", label: "Adopt by consensus" },
  { value: "recorded", label: "Recorded vote" },
] as const;

/** @deprecated Use VOTE_MODES; retained for old motion history display. */
export const VOTE_MANNERS = [
  "Vote by Acclamation",
  "Vote by Roll Call",
  "Vote by Placard",
];

export const DEFAULT_DELEGATES_GA = [
  "United States",
  "United Kingdom",
  "France",
  "China",
  "Russian Federation",
  "Brazil",
  "India",
  "Japan",
  "Germany",
  "South Africa",
  "Mexico",
  "Canada",
  "Australia",
  "Egypt",
  "Kenya",
  "Nigeria",
  "Argentina",
  "Colombia",
  "South Korea",
  "Indonesia",
];
