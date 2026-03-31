export interface EventTemplate {
  version: string;
  templateId: string;
  name: string;
  description?: string;
  event: {
    name: string;
    date?: string;
    budget?: number;
  };
  halls: string[];
}
