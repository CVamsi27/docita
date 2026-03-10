import { Injectable } from '@nestjs/common';
import { DocumentContent } from '@/shared/modules/document-generation/builders';

type TableContent = {
  columns: string[];
  data: Record<string, string | number>[];
};

function toTableContent(value: unknown): TableContent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { columns: [], data: [] };
  }

  const record = Object.fromEntries(Object.entries(value));
  const columns = Array.isArray(record.columns)
    ? record.columns.filter((col): col is string => typeof col === 'string')
    : [];
  const data = Array.isArray(record.data)
    ? record.data
        .filter((row) => row && typeof row === 'object' && !Array.isArray(row))
        .map((row) =>
          Object.fromEntries(
            Object.entries(row).filter(
              (entry): entry is [string, string | number] =>
                typeof entry[1] === 'string' || typeof entry[1] === 'number',
            ),
          ),
        )
    : [];

  return { columns, data };
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

@Injectable()
export class PdfRendererService {
  renderToPdf(_content: DocumentContent): Buffer {
    return Buffer.from('PDF content would go here');
  }

  private contentToHtml(content: DocumentContent): string {
    let html = '<html><body>';

    if (content.metadata?.title) {
      html += `<h1>${content.metadata.title}</h1>`;
    }

    for (const section of content.sections) {
      switch (section.type) {
        case 'heading': {
          const level = section.styling?.level || 1;
          const headingContent =
            typeof section.content === 'string' ? section.content : '';
          html += `<h${level}>${headingContent}</h${level}>`;
          break;
        }
        case 'paragraph': {
          const paragraphContent =
            typeof section.content === 'string' ? section.content : '';
          html += `<p>${paragraphContent}</p>`;
          break;
        }
        case 'table':
          html += this.renderTable(toTableContent(section.content));
          break;
        case 'list':
          html += this.renderList(toStringList(section.content));
          break;
        case 'image': {
          const imageContent =
            typeof section.content === 'string' ? section.content : '';
          html += `<img src="data:image/png;base64,${imageContent}" />`;
          break;
        }
      }
    }

    html += '</body></html>';
    return html;
  }

  private renderTable(tableData: {
    columns: string[];
    data: Record<string, string | number>[];
  }): string {
    let html = '<table>';

    html += '<thead><tr>';
    for (const column of tableData.columns) {
      html += `<th>${column}</th>`;
    }
    html += '</tr></thead>';

    html += '<tbody>';
    for (const row of tableData.data) {
      html += '<tr>';
      for (const column of tableData.columns) {
        html += `<td>${row[column] || ''}</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table>';

    return html;
  }

  private renderList(items: string[]): string {
    let html = '<ul>';
    for (const item of items) {
      html += `<li>${item}</li>`;
    }
    html += '</ul>';
    return html;
  }
}
