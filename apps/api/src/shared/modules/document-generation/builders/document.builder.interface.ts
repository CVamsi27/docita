/**
 * Document Builder Interface
 * Base interface for building various document types
 */

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
  /**
   * Set document metadata (title, author, etc.)
   */
  setMetadata(metadata: DocumentMetadata): this;

  /**
   * Add a heading
   */
  addHeading(text: string, level: number): this;

  /**
   * Add a paragraph
   */
  addParagraph(text: string): this;

  /**
   * Add a table
   */
  addTable(data: Record<string, string | number>[], columns: string[]): this;

  /**
   * Add a list
   */
  addList(items: string[]): this;

  /**
   * Add an image
   */
  addImage(base64: string, width?: number, height?: number): this;

  /**
   * Build the document
   */
  build(): DocumentContent;

  /**
   * Reset the builder
   */
  reset(): this;
}
