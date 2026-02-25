/**
 * Base Document Builder
 * Abstract base class with common document building logic
 */

import {
  IDocumentBuilder,
  DocumentContent,
  DocumentSection,
  DocumentMetadata,
} from './document.builder.interface';

export abstract class BaseDocumentBuilder implements IDocumentBuilder {
  protected sections: DocumentSection[] = [];
  protected metadata: DocumentMetadata | undefined;

  setMetadata(metadata: DocumentMetadata): this {
    this.metadata = metadata;
    return this;
  }

  addHeading(text: string, level: number = 1): this {
    this.sections.push({
      type: 'heading',
      content: text,
      styling: { level },
    });
    return this;
  }

  addParagraph(text: string): this {
    this.sections.push({
      type: 'paragraph',
      content: text,
    });
    return this;
  }

  addTable(data: Record<string, string | number>[], columns: string[]): this {
    this.sections.push({
      type: 'table',
      content: { data, columns },
    });
    return this;
  }

  addList(items: string[]): this {
    this.sections.push({
      type: 'list',
      content: items,
    });
    return this;
  }

  addImage(base64: string, width?: number, height?: number): this {
    const styling: Record<string, string | number | boolean> = {};
    if (width !== undefined) styling.width = width;
    if (height !== undefined) styling.height = height;

    this.sections.push({
      type: 'image',
      content: base64,
      styling: Object.keys(styling).length > 0 ? styling : undefined,
    });
    return this;
  }

  build(): DocumentContent {
    return {
      sections: [...this.sections],
      metadata: this.metadata,
    };
  }

  reset(): this {
    this.sections = [];
    this.metadata = undefined;
    return this;
  }
}
