export const PANTHER_PURPLE = {
  50: "#f5f0fa",
  100: "#e8daef",
  200: "#d2b4de",
  300: "#bb8fce",
  400: "#a569bd",
  500: "#8e44ad",
  600: "#7d3c98",
  700: "#6c3483",
  800: "#5b2c6f",
  900: "#4a235a",
};

export const GA_RUBRIC = [
  { key: "research", label: "Preparation and Research", max: 5 },
  { key: "policy", label: "Policy Alignment", max: 5 },
  { key: "leading", label: "Bloc Leading and Debate", max: 5 },
  { key: "impact", label: "Impact and Efficacy", max: 5 },
  { key: "debate", label: "Debate Engagement and Skill", max: 5 },
  { key: "diplomacy", label: "Diplomacy and Etiquette", max: 5 },
  { key: "rules", label: "Rules and Procedure", max: 5 },
  { key: "formatting", label: "Formatting", max: 5 },
];

export const CRISIS_RUBRIC = [
  { key: "crisis_management", label: "Crisis Management", max: 10 },
  { key: "character", label: "Character & Authenticity", max: 10 },
  { key: "diplomacy", label: "Diplomacy & Collaboration", max: 10 },
  { key: "speaking", label: "Public Speaking", max: 10 },
  { key: "directive_quality", label: "Directive Quality", max: 10 },
];

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
  type: "text" | "textarea" | "select" | "document_select";
  options?: MotionFieldOption[];
  showWhen?: MotionFieldShowWhen;
}

export const MOTION_TYPES: {
  id: string;
  label: string;
  rule: number;
  disruptivity: number;
  fields: MotionField[];
}[] = [
  {
    id: "close_debate",
    label: "Motion to Close Debate",
    rule: 20,
    disruptivity: 100,
    fields: [],
  },
  {
    id: "enter_voting",
    label: "Motion to Enter Voting Procedure",
    rule: 21,
    disruptivity: 95,
    fields: [
      {
        key: "two_for_two_against",
        label: "2-for-2-against period?",
        type: "select",
        options: [
          { value: "no", label: "No" },
          { value: "yes", label: "Yes" },
        ],
      },
      {
        key: "speaking_time",
        label: "Speaking time (sec)",
        type: "text",
        showWhen: { field: "two_for_two_against", value: "yes" },
      },
      {
        key: "speaker_order",
        label: "Order of speakers",
        type: "select",
        options: [
          { value: "for_first", label: "For first, then alternate" },
          { value: "against_first", label: "Against first, then alternate" },
        ],
        showWhen: { field: "two_for_two_against", value: "yes" },
      },
      { key: "paper_order", label: "Order of papers to vote", type: "text" },
      { key: "vote_manner", label: "Voting manner", type: "select" },
    ],
  },
  {
    id: "suspend_debate",
    label: "Motion to Suspend Debate",
    rule: 19,
    disruptivity: 90,
    fields: [],
  },
  {
    id: "division_question",
    label: "Motion for Division of the Question",
    rule: 18,
    disruptivity: 85,
    fields: [
      { key: "target", label: "Resolution/amendment", type: "text" },
      { key: "parts", label: "Parts to divide", type: "text" },
    ],
  },
  {
    id: "amend",
    label: "Motion to Amend",
    rule: 17,
    disruptivity: 80,
    fields: [
      {
        key: "resolution",
        label: "Draft resolution",
        type: "document_select",
      },
      { key: "clause", label: "Clause to amend", type: "text" },
      { key: "language", label: "Proposed language", type: "textarea" },
      {
        key: "amendment_type",
        label: "Friendly or unfriendly",
        type: "select",
        options: [
          { value: "friendly", label: "Friendly" },
          { value: "unfriendly", label: "Unfriendly" },
        ],
      },
    ],
  },
  {
    id: "present_draft",
    label: "Motion to Present Draft Resolutions",
    rule: 16,
    disruptivity: 75,
    fields: [
      { key: "reading_period", label: "Reading period (min)", type: "text" },
      { key: "presentation_period", label: "Presentation period (min)", type: "text" },
      { key: "qa_period", label: "Q&A period (min)", type: "text" },
    ],
  },
  {
    id: "moderated_caucus",
    label: "Motion for Moderated Caucus",
    rule: 7,
    disruptivity: 60,
    fields: [
      { key: "duration", label: "Duration (min)", type: "text" },
      { key: "speaking_time", label: "Speaking time (sec)", type: "text" },
      { key: "topic", label: "Topic", type: "text" },
      {
        key: "speak_order",
        label: "Reserve first/last?",
        type: "select",
        options: [
          { value: "", label: "None" },
          { value: "first", label: "Speak first" },
          { value: "last", label: "Speak last" },
        ],
      },
    ],
  },
  {
    id: "unmoderated_caucus",
    label: "Motion for Unmoderated Caucus",
    rule: 8,
    disruptivity: 55,
    fields: [{ key: "duration", label: "Duration (min)", type: "text" }],
  },
  {
    id: "gentlemans_caucus",
    label: "Motion for Gentleman's Unmoderated Caucus",
    rule: 10,
    disruptivity: 54,
    fields: [
      { key: "duration", label: "Duration (min)", type: "text" },
      { key: "topic", label: "Topic (optional)", type: "text" },
    ],
  },
  {
    id: "round_robin",
    label: "Motion for Round Robin",
    rule: 9,
    disruptivity: 50,
    fields: [
      { key: "speaking_time", label: "Speaking time (sec)", type: "text" },
      { key: "topic", label: "Topic", type: "text" },
      { key: "order", label: "Speaking order", type: "text" },
    ],
  },
  {
    id: "open_speakers_list",
    label: "Motion to Open General Speakers List",
    rule: 11,
    disruptivity: 40,
    fields: [
      { key: "speaking_time", label: "Speaking time (sec)", type: "text" },
    ],
  },
  {
    id: "open_debate",
    label: "Motion to Open Debate",
    rule: 6,
    disruptivity: 30,
    fields: [],
  },
  {
    id: "set_agenda",
    label: "Motion to Set the Agenda",
    rule: 5,
    disruptivity: 20,
    fields: [{ key: "topic", label: "Agenda topic", type: "text" }],
  },
];

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
