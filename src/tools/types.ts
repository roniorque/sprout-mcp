export interface Parameter {
  name: string;
  in: string;
  type: string;
  required: boolean;
  description: string;
}

export interface Endpoint {
  title: string;
  method?: string;
  url?: string;
  auth?: { headers: string[] };
  description?: string;
  parameters?: Parameter[];
  requestBody?: unknown;
  responseExample?: unknown;
}

export interface SectionData {
  group: string;
  groupLabel: string;
  section: string;
  sectionLabel: string;
  label?: string;
  endpoints: Endpoint[];
}

export interface SectionEntry {
  file: string;
  toolName: string;
  description: string;
}

export interface GroupEntry {
  label: string;
  sections: SectionEntry[];
}

export interface Index {
  groups: GroupEntry[];
}
