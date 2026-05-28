export const STORAGE_KEYS = {
  subjects: {
    list: "med-pilot-subjects-v4",
  },
  strategy: {
    active: "med-pilot-active-strategy",
  },
  session: {
    daily: "med-pilot-daily-session",
    history: "med-pilot-session-history",
    timing: "med-pilot-session-timing",
  },
  simulation: {
    errorBank: "med-pilot-error-bank",
  },
  events: {
    list: "med-pilot-events",
  },
  planning: {
    slots: "albugi-planning-slots",
    events: "albugi-planning-events",
    deadlines: "albugi-planning-deadlines",
  },
  home: {
    ednDate: "med-pilot-edn-date",
    quickTasks: "med-pilot-quick-tasks",
    quickNotes: "med-pilot-quick-notes",
  },
  notes: {
    workspace: "albugimed-notes-workspace-v1",
  },
  chat: {
    history: "dp_chat_history",
    lastMessageTime: "dp_last_message_time",
  },
} as const;

type StorageKeyGroups = {
  [K in keyof typeof STORAGE_KEYS]: typeof STORAGE_KEYS[K][keyof typeof STORAGE_KEYS[K]];
};

export type StorageKey = StorageKeyGroups[keyof StorageKeyGroups];
