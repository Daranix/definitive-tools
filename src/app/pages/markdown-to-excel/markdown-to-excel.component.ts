import { Component, inject, model, computed, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TopNavbarComponent } from '@/app/components/top-navbar/top-navbar.component';
import { MetadataService } from '@/app/services/metadata.service';

export interface TableData {
  headers: string[];
  rows: string[][];
  alignments: ('left' | 'center' | 'right' | null)[];
}

@Component({
  selector: 'app-markdown-to-excel',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TopNavbarComponent],
  templateUrl: './markdown-to-excel.component.html',
  styleUrl: './markdown-to-excel.component.scss'
})
export class MarkdownToExcelComponent {
  private readonly metadataService = inject(MetadataService);

  readonly inputText = model<string>('');

  readonly tableData = computed<TableData | null>(() => {
    return this.parseMarkdownTable(this.inputText());
  });

  readonly columnLetters = computed<string[]>(() => {
    const data = this.tableData();
    if (!data) return [];
    return data.headers.map((_, i) => this.getColumnLetter(i));
  });

  // Selection signals
  readonly selectionStart = signal<{ row: number, col: number } | null>(null);
  readonly selectionEnd = signal<{ row: number, col: number } | null>(null);
  readonly isSelecting = signal<boolean>(false);
  readonly isCopied = signal<boolean>(false);

  private getColumnLetter(index: number): string {
    let letter = '';
    while (index >= 0) {
      letter = String.fromCharCode((index % 26) + 65) + letter;
      index = Math.floor(index / 26) - 1;
    }
    return letter;
  }

  startSelection(row: number, col: number, event: MouseEvent) {
    this.isSelecting.set(true);
    this.isCopied.set(false);
    if (event.shiftKey && this.selectionStart()) {
      // Keep current start, update end
      this.selectionEnd.set({ row, col });
    } else {
      this.selectionStart.set({ row, col });
      this.selectionEnd.set({ row, col });
    }
  }

  updateSelection(row: number, col: number) {
    if (this.isSelecting()) {
      this.selectionEnd.set({ row, col });
    }
  }

  @HostListener('window:mouseup')
  endSelection() {
    this.isSelecting.set(false);
  }

  isCellSelected(row: number, col: number): boolean {
    const start = this.selectionStart();
    const end = this.selectionEnd();
    if (!start || !end) return false;

    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);

    return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
  }

  getSelectionClasses(row: number, col: number) {
    const start = this.selectionStart();
    const end = this.selectionEnd();
    if (!start || !end) return {};

    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);

    if (row < minRow || row > maxRow || col < minCol || col > maxCol) return {};

    const isCopied = this.isCopied();

    return {
      'selected-cell': true,
      'sel-top': row === minRow && !isCopied,
      'sel-bottom': row === maxRow && !isCopied,
      'sel-left': col === minCol && !isCopied,
      'sel-right': col === maxCol && !isCopied,
      'sel-copied-top': row === minRow && isCopied,
      'sel-copied-bottom': row === maxRow && isCopied,
      'sel-copied-left': col === minCol && isCopied,
      'sel-copied-right': col === maxCol && isCopied
    };
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
      this.copySelectedToClipboard();
    }
  }

  private copySelectedToClipboard() {
    const data = this.tableData();
    const start = this.selectionStart();
    const end = this.selectionEnd();

    if (!data || !start || !end) return;

    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);

    // Prepare data for headers if included in selection
    let tsv = '';
    
    // If headers are part of selection (row -1)
    if (minRow === -1) {
      const headerRow = [];
      for (let c = minCol; c <= maxCol; c++) {
        headerRow.push(data.headers[c]);
      }
      tsv += headerRow.join('\t') + '\n';
    }

    // Prepare data for rows
    for (let r = Math.max(0, minRow); r <= maxRow; r++) {
      const rowData = [];
      for (let c = minCol; c <= maxCol; c++) {
        rowData.push(data.rows[r][c]);
      }
      tsv += rowData.join('\t') + '\n';
    }

    if (tsv) {
      navigator.clipboard.writeText(tsv.trim()).then(() => {
        this.isCopied.set(true);
      });
    }
  }

  constructor() {
    this.metadataService.updateMetadata({
      title: 'Markdown to Excel Converter',
      description: 'Convert Markdown tables to Excel-compatible formats (TSV) easily. Copy and paste your data directly into your favorite spreadsheet software.',
      keywords: 'markdown, excel, converter, table, tsv, spreadsheet, developer tools'
    });
  }

  private parseMarkdownTable(input: string): TableData | null {
    if (!input || !input.trim()) return null;

    const lines = input.trim().split('\n').map(l => l.trim());
    if (lines.length < 2) return null;

    // Filter out lines that don't look like table lines (at least one |)
    const tableLines = lines.filter(line => line.includes('|'));
    if (tableLines.length < 2) return null;

    // Find the header and divider rows
    let headerRowIndex = -1;
    let dividerRowIndex = -1;

    for (let i = 0; i < tableLines.length - 1; i++) {
      if (this.isDividerRow(tableLines[i + 1])) {
        headerRowIndex = i;
        dividerRowIndex = i + 1;
        break;
      }
    }

    if (headerRowIndex === -1) return null;

    const headers = this.splitRow(tableLines[headerRowIndex]);
    const alignments = this.parseAlignments(tableLines[dividerRowIndex]);
    
    const rows: string[][] = [];
    for (let i = dividerRowIndex + 1; i < tableLines.length; i++) {
      const rowData = this.splitRow(tableLines[i]);
      if (rowData.length > 0) {
        // Pad or trim row data to match headers length
        const normalizedRow = Array(headers.length).fill('');
        rowData.forEach((val, idx) => {
          if (idx < headers.length) normalizedRow[idx] = val;
        });
        rows.push(normalizedRow);
      }
    }

    return { headers, rows, alignments };
  }

  private isDividerRow(line: string): boolean {
    // A divider row contains only |, -, :, and whitespace
    return /^[|\s\-:]+$/.test(line) && line.includes('-') && line.includes('|');
  }

  private splitRow(line: string): string[] {
    // Remove leading and trailing pipes
    const trimmed = line.replace(/^\|/, '').replace(/\|$/, '');
    return trimmed.split('|').map(cell => cell.trim());
  }

  private parseAlignments(line: string): ('left' | 'center' | 'right' | null)[] {
    const cells = this.splitRow(line);
    return cells.map(cell => {
      const hasLeft = cell.startsWith(':');
      const hasRight = cell.endsWith(':');
      if (hasLeft && hasRight) return 'center';
      if (hasLeft) return 'left';
      if (hasRight) return 'right';
      return null;
    });
  }

  handleClear() {
    this.inputText.set('');
  }
}
