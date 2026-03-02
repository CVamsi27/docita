export interface DocumentContent {
  sections: DocumentSection[];
  metadata?: DocumentMetadata;
}

export interface DocumentSection {
  type: 'heading' | 'paragraph' | 'table' | 'list' | 'image';
  content:
    | string
    | string[]
    | { columns: string[]; data: Record<string, string | number>[] };
  styling?: Record<string, string | number | boolean>;
}

export interface DocumentMetadata {
  title: string;
  author?: string;
  createdDate?: Date;
  subject?: string;
}

export interface IDocumentBuilder {
  setMetadata(metadata: DocumentMetadata): this;

  addHeading(text: string, level: number): this;

  addParagraph(text: string): this;

  addTable(data: Record<string, string | number>[], columns: string[]): this;

  addList(items: string[]): this;

  addImage(base64: string, width?: number, height?: number): this;

  build(): DocumentContent;

  reset(): this;
}
