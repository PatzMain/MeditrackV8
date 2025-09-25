declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';

  interface UserOptions {
    head?: any[][];
    body?: any[][];
    foot?: any[][];
    startY?: number;
    margin?: { top?: number; right?: number; bottom?: number; left?: number };
    pageBreak?: 'auto' | 'avoid' | 'always';
    rowPageBreak?: 'auto' | 'avoid';
    tableWidth?: 'auto' | 'wrap' | number;
    showHead?: 'everyPage' | 'firstPage' | 'never';
    showFoot?: 'everyPage' | 'lastPage' | 'never';
    theme?: 'striped' | 'grid' | 'plain';
    useCss?: boolean;
    includeHiddenHtml?: boolean;
    html?: string | HTMLTableElement;
    htmlParser?: (element: HTMLTableElement) => any;
    foot?: any[][];
    bodyStyles?: any;
    headStyles?: any;
    footStyles?: any;
    alternateRowStyles?: any;
    columnStyles?: any;
    didDrawCell?: (data: any) => void;
    didDrawPage?: (data: any) => void;
    willDrawCell?: (data: any) => void;
    willDrawPage?: (data: any) => void;
    didParseCell?: (data: any) => void;
  }

  export default function autoTable(doc: jsPDF, options: UserOptions): void;
}