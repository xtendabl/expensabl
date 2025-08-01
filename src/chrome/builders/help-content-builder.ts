import { HELP_CONTENT } from '../constants/help-content';

export class HelpContentBuilder {
  /**
   * Sanitize text to prevent XSS attacks
   */
  private sanitize(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Build the complete help content HTML
   */
  build(content: typeof HELP_CONTENT): string {
    return content.sections.map((section) => this.buildSection(section)).join('');
  }

  /**
   * Build a single section with heading and content
   */
  buildSection(section: (typeof HELP_CONTENT.sections)[0]): string {
    const id = section.id || this.generateId(section.heading);
    return `
      <div class="help-item" id="${id}">
        <h4>${this.sanitize(section.heading)}</h4>
        ${section.content.map((element) => this.buildElement(element)).join('')}
      </div>
    `;
  }

  /**
   * Build individual content elements based on type
   */
  private buildElement(element: (typeof HELP_CONTENT.sections)[0]['content'][0]): string {
    switch (element.type) {
      case 'paragraph':
        return this.buildParagraph(element);
      case 'bullets':
        return this.buildBulletList(element);
      case 'table':
        return this.buildTable(element);
      default:
        return '';
    }
  }

  /**
   * Build a paragraph with text formatting support
   */
  private buildParagraph(element: { type: 'paragraph'; text: string }): string {
    return `<p>${this.formatText(element.text)}</p>`;
  }

  /**
   * Build a bullet list
   */
  private buildBulletList(element: { type: 'bullets'; items: string[] }): string {
    const items = element.items.map((item) => `<p>• ${this.formatText(item)}</p>`).join('');
    return items;
  }

  /**
   * Build a table with headers and rows
   */
  private buildTable(element: { type: 'table'; headers: string[]; rows: string[][] }): string {
    const headers = element.headers.map((h) => `<th>${this.sanitize(h)}</th>`).join('');

    const rows = element.rows
      .map((row) => {
        const cells = row.map((cell) => `<td>${this.formatText(cell)}</td>`).join('');
        return `<tr>${cells}</tr>`;
      })
      .join('');

    return `
      <table class="help-table">
        <thead><tr>${headers}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  /**
   * Format text with support for basic markdown-like syntax
   */
  private formatText(text: string): string {
    // Sanitize first
    let formatted = this.sanitize(text);

    // Support inline formatting
    formatted = formatted
      // Bold: **text**
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Code: `code`
      .replace(/`(.+?)`/g, '<code>$1</code>')
      // Links: [text](url)
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>');

    return formatted;
  }

  /**
   * Generate a valid HTML ID from heading text
   */
  private generateId(heading: string): string {
    return `help-${heading
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')}`;
  }
}
