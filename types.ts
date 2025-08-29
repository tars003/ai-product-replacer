export interface ImageFile {
  file: File;
  base64: string;
}

export interface LogEntryInput {
  prompt: string;
  images?: {
    label: string;
    base64: string;
  }[];
}

export interface LogEntryOutput {
  text?: string | null;
  image?: string | null; // base64
}

export interface LogEntry {
  step: number;
  title: string;
  model: string;
  input: LogEntryInput;
  output: LogEntryOutput;
}
