import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, HeadingLevel, AlignmentType, WidthType, Header, Footer } from 'docx';
import { saveAs } from 'file-saver';

export interface DataTable {
  id: string;
  department: string;
  classification: string;
  data: any[];
  stats: {
    totalItems: number;
    lowStockItems: number;
    outOfStockItems: number;
    expiredItems: number;
    maintenanceItems?: number;
  };
}

export interface ExportOptions {
  format: 'excel' | 'pdf' | 'csv' | 'docx';
  tables?: DataTable[];
  filename: string;
  title: string;
  columns: ColumnConfig[];
  includeStats?: boolean;
  // Legacy support for single table export
  data?: any[];
  department?: string;
  classification?: string;
  stats?: {
    totalItems: number;
    lowStockItems: number;
    outOfStockItems: number;
    expiredItems: number;
    maintenanceItems?: number;
  };
}

export interface ColumnConfig {
  key: string;
  header: string;
  width?: number;
  formatter?: (value: any) => string;
}

class ExportService {
  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private formatStatus(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private getClassificationIcon(classification: string): string {
    switch (classification.toLowerCase()) {
      case 'medicines': return '💊';
      case 'supplies': return '🧰';
      case 'equipment': return '🔬';
      default: return '📦';
    }
  }

  async exportToExcel(options: ExportOptions): Promise<void> {
    const { tables, filename, columns, includeStats, data, department, classification, stats } = options;

    // Support legacy single table export
    const exportTables = tables || (data && department && classification ? [{
      id: `${department}_${classification}`,
      department,
      classification,
      data,
      stats: stats || { totalItems: 0, lowStockItems: 0, outOfStockItems: 0, expiredItems: 0 }
    }] : []);

    // Create workbook
    const wb = XLSX.utils.book_new();

    if (exportTables.length === 1) {
      // Single table export - use existing format
      const table = exportTables[0];
      const headerData = [
        ['MEDITRACK INVENTORY REPORT'],
        [''],
        [`Department: ${table.department.charAt(0).toUpperCase() + table.department.slice(1)}`],
        [`Classification: ${table.classification.charAt(0).toUpperCase() + table.classification.slice(1)} ${this.getClassificationIcon(table.classification)}`],
        [`Generated: ${this.formatDate(new Date())}`],
        [`Total Items: ${table.data.length}`],
        ['']
      ];

      // Add statistics if included
      if (includeStats && table.stats) {
        headerData.push(
          ['INVENTORY STATISTICS'],
          [`Total Items: ${table.stats.totalItems}`],
          [`Low Stock: ${table.stats.lowStockItems}`],
          [`Out of Stock: ${table.stats.outOfStockItems}`],
          [`Expired: ${table.stats.expiredItems}`]
        );

        if (table.stats.maintenanceItems !== undefined) {
          headerData.push([`Maintenance Required: ${table.stats.maintenanceItems}`]);
        }

        headerData.push(['']);
      }

      // Add table headers
      headerData.push(columns.map(col => col.header));

      // Add data rows
      const tableData = table.data.map(item =>
        columns.map(col => {
          const value = item[col.key];
          if (col.formatter) {
            return col.formatter(value);
          }
          if (col.key === 'status') {
            return this.formatStatus(value || 'Unknown');
          }
          return value || '';
        })
      );

      // Combine all data
      const wsData = [...headerData, ...tableData];

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Set column widths
      const colWidths = columns.map(col => ({ wch: col.width || 15 }));
      ws['!cols'] = colWidths;

      // Style title row
      if (ws['A1']) {
        ws['A1'].s = {
          font: { bold: true, sz: 16 },
          alignment: { horizontal: 'center' },
          fill: { fgColor: { rgb: 'E3F2FD' } }
        };
      }

      // Merge title cell
      ws['!merges'] = [{ s: { c: 0, r: 0 }, e: { c: columns.length - 1, r: 0 } }];

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Inventory Report');
    } else {
      // Multiple tables export - create separate sheets
      // Create summary sheet first
      const summaryData = [
        ['MEDITRACK MULTI-TABLE INVENTORY REPORT'],
        [''],
        [`Generated: ${this.formatDate(new Date())}`],
        [`Total Tables: ${exportTables.length}`],
        ['']
      ];

      if (includeStats) {
        summaryData.push(['SUMMARY STATISTICS']);
        const totalStats = exportTables.reduce((acc, table) => ({
          totalItems: acc.totalItems + table.stats.totalItems,
          lowStockItems: acc.lowStockItems + table.stats.lowStockItems,
          outOfStockItems: acc.outOfStockItems + table.stats.outOfStockItems,
          expiredItems: acc.expiredItems + table.stats.expiredItems,
          maintenanceItems: acc.maintenanceItems + (table.stats.maintenanceItems || 0)
        }), { totalItems: 0, lowStockItems: 0, outOfStockItems: 0, expiredItems: 0, maintenanceItems: 0 });

        summaryData.push(
          [`Total Items: ${totalStats.totalItems}`],
          [`Low Stock: ${totalStats.lowStockItems}`],
          [`Out of Stock: ${totalStats.outOfStockItems}`],
          [`Expired: ${totalStats.expiredItems}`],
          [`Maintenance Required: ${totalStats.maintenanceItems}`],
          ['']
        );
      }

      summaryData.push(['TABLE BREAKDOWN']);
      exportTables.forEach(table => {
        summaryData.push([
          `${table.department.charAt(0).toUpperCase() + table.department.slice(1)} - ${table.classification.charAt(0).toUpperCase() + table.classification.slice(1)}`,
          `${table.data.length} items`
        ]);
      });

      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      if (summaryWs['A1']) {
        summaryWs['A1'].s = {
          font: { bold: true, sz: 16 },
          alignment: { horizontal: 'center' },
          fill: { fgColor: { rgb: 'E3F2FD' } }
        };
      }
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

      // Create individual sheets for each table
      exportTables.forEach(table => {
        const sheetData = [
          [`${table.department.charAt(0).toUpperCase() + table.department.slice(1)} - ${table.classification.charAt(0).toUpperCase() + table.classification.slice(1)} ${this.getClassificationIcon(table.classification)}`],
          [''],
          [`Total Items: ${table.data.length}`],
          ['']
        ];

        if (includeStats) {
          sheetData.push(
            ['STATISTICS'],
            [`Total Items: ${table.stats.totalItems}`],
            [`Low Stock: ${table.stats.lowStockItems}`],
            [`Out of Stock: ${table.stats.outOfStockItems}`],
            [`Expired: ${table.stats.expiredItems}`]
          );

          if (table.stats.maintenanceItems !== undefined) {
            sheetData.push([`Maintenance Required: ${table.stats.maintenanceItems}`]);
          }

          sheetData.push(['']);
        }

        // Add table headers
        sheetData.push(columns.map(col => col.header));

        // Add data rows
        const tableData = table.data.map(item =>
          columns.map(col => {
            const value = item[col.key];
            if (col.formatter) {
              return col.formatter(value);
            }
            if (col.key === 'status') {
              return this.formatStatus(value || 'Unknown');
            }
            return value || '';
          })
        );

        sheetData.push(...tableData);

        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        const colWidths = columns.map(col => ({ wch: col.width || 15 }));
        ws['!cols'] = colWidths;

        // Style header
        if (ws['A1']) {
          ws['A1'].s = {
            font: { bold: true, sz: 14 },
            alignment: { horizontal: 'center' },
            fill: { fgColor: { rgb: 'F0F9FF' } }
          };
        }

        const sheetName = `${table.department.charAt(0).toUpperCase()}${table.department.slice(1)}_${table.classification}`.substring(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });
    }

    // Write file
    XLSX.writeFile(wb, `${filename}.xlsx`);
  }

  async exportToPDF(options: ExportOptions): Promise<void> {
    const { tables, filename, columns, includeStats, data, department, classification, stats } = options;

    // Support legacy single table export
    const exportTables = tables || (data && department && classification ? [{
      id: `${department}_${classification}`,
      department,
      classification,
      data,
      stats: stats || { totalItems: 0, lowStockItems: 0, outOfStockItems: 0, expiredItems: 0 }
    }] : []);

    // Create PDF document
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    if (exportTables.length === 1) {
      // Single table export
      const table = exportTables[0];

      // Header
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('MEDITRACK INVENTORY REPORT', pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');

      let yPosition = 35;

      // Department and Classification info
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`${table.department.charAt(0).toUpperCase() + table.department.slice(1)} Department`, 20, yPosition);
      yPosition += 8;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Classification: ${table.classification.charAt(0).toUpperCase() + table.classification.slice(1)} ${this.getClassificationIcon(table.classification)}`, 20, yPosition);
      yPosition += 6;

      doc.text(`Generated: ${this.formatDate(new Date())}`, 20, yPosition);
      yPosition += 6;

      doc.text(`Total Items: ${table.data.length}`, 20, yPosition);
      yPosition += 10;

      // Statistics section
      if (includeStats && table.stats) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('INVENTORY STATISTICS', 20, yPosition);
        yPosition += 8;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);

        const statItems = [
          `Total Items: ${table.stats.totalItems}`,
          `Low Stock: ${table.stats.lowStockItems}`,
          `Out of Stock: ${table.stats.outOfStockItems}`,
          `Expired: ${table.stats.expiredItems}`
        ];

        if (table.stats.maintenanceItems !== undefined) {
          statItems.push(`Maintenance Required: ${table.stats.maintenanceItems}`);
        }

        statItems.forEach((stat, index) => {
          const xPos = index % 2 === 0 ? 20 : pageWidth / 2;
          if (index % 2 === 0 && index > 0) yPosition += 6;
          doc.text(stat, xPos, yPosition);
        });

        yPosition += 15;
      }

      // Table data
      const tableColumns = columns.map(col => col.header);
      const tableRows = table.data.map(item =>
        columns.map(col => {
          const value = item[col.key];
          if (col.formatter) {
            return col.formatter(value);
          }
          if (col.key === 'status') {
            return this.formatStatus(value || 'Unknown');
          }
          return value || '';
        })
      );

      // Add table
      autoTable(doc, {
        head: [tableColumns],
        body: tableRows,
        startY: yPosition,
        theme: 'striped',
        headStyles: {
          fillColor: [25, 118, 210],
          textColor: 255,
          fontSize: 10,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 9,
          cellPadding: 3
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        columnStyles: {
          0: { cellWidth: 'auto', minCellWidth: 15 },
          1: { cellWidth: 'auto', minCellWidth: 25 },
          2: { cellWidth: 'auto', minCellWidth: 25 },
          3: { cellWidth: 'auto', minCellWidth: 20 },
          4: { cellWidth: 'auto', minCellWidth: 15 },
          5: { cellWidth: 'auto', minCellWidth: 20 },
          6: { cellWidth: 'auto', minCellWidth: 15 }
        },
        margin: { top: 10, left: 10, right: 10 },
        didDrawPage: (data) => {
          const pageNumber = doc.getNumberOfPages();
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.text(
            `Page ${data.pageNumber} of ${pageNumber} | Generated by MediTrack`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
          );
        }
      });
    } else {
      // Multiple tables export
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('MEDITRACK MULTI-TABLE INVENTORY REPORT', pageWidth / 2, 20, { align: 'center' });

      let yPosition = 35;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${this.formatDate(new Date())}`, 20, yPosition);
      yPosition += 6;
      doc.text(`Total Tables: ${exportTables.length}`, 20, yPosition);
      yPosition += 10;

      if (includeStats) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('SUMMARY STATISTICS', 20, yPosition);
        yPosition += 8;

        const totalStats = exportTables.reduce((acc, table) => ({
          totalItems: acc.totalItems + table.stats.totalItems,
          lowStockItems: acc.lowStockItems + table.stats.lowStockItems,
          outOfStockItems: acc.outOfStockItems + table.stats.outOfStockItems,
          expiredItems: acc.expiredItems + table.stats.expiredItems,
          maintenanceItems: acc.maintenanceItems + (table.stats.maintenanceItems || 0)
        }), { totalItems: 0, lowStockItems: 0, outOfStockItems: 0, expiredItems: 0, maintenanceItems: 0 });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);

        const statItems = [
          `Total Items: ${totalStats.totalItems}`,
          `Low Stock: ${totalStats.lowStockItems}`,
          `Out of Stock: ${totalStats.outOfStockItems}`,
          `Expired: ${totalStats.expiredItems}`,
          `Maintenance Required: ${totalStats.maintenanceItems}`
        ];

        statItems.forEach((stat, index) => {
          const xPos = index % 2 === 0 ? 20 : pageWidth / 2;
          if (index % 2 === 0 && index > 0) yPosition += 6;
          doc.text(stat, xPos, yPosition);
        });

        yPosition += 15;
      }

      // Table breakdown
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('TABLE BREAKDOWN', 20, yPosition);
      yPosition += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);

      exportTables.forEach(table => {
        doc.text(
          `${table.department.charAt(0).toUpperCase() + table.department.slice(1)} - ${table.classification.charAt(0).toUpperCase() + table.classification.slice(1)}: ${table.data.length} items`,
          20,
          yPosition
        );
        yPosition += 6;
      });

      yPosition += 10;

      // Add each table
      exportTables.forEach((table, tableIndex) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 100) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(
          `${table.department.charAt(0).toUpperCase() + table.department.slice(1)} - ${table.classification.charAt(0).toUpperCase() + table.classification.slice(1)} ${this.getClassificationIcon(table.classification)}`,
          20,
          yPosition
        );
        yPosition += 10;

        const tableColumns = columns.map(col => col.header);
        const tableRows = table.data.slice(0, 50).map(item => // Limit to 50 items per table in PDF
          columns.map(col => {
            const value = item[col.key];
            if (col.formatter) {
              return col.formatter(value);
            }
            if (col.key === 'status') {
              return this.formatStatus(value || 'Unknown');
            }
            return value || '';
          })
        );

        autoTable(doc, {
          head: [tableColumns],
          body: tableRows,
          startY: yPosition,
          theme: 'striped',
          headStyles: {
            fillColor: [25, 118, 210],
            textColor: 255,
            fontSize: 9,
            fontStyle: 'bold'
          },
          bodyStyles: {
            fontSize: 8,
            cellPadding: 2
          },
          alternateRowStyles: {
            fillColor: [245, 245, 245]
          },
          margin: { top: 10, left: 10, right: 10 },
          didDrawPage: (data) => {
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(
              `Page ${data.pageNumber} | Generated by MediTrack`,
              pageWidth / 2,
              pageHeight - 10,
              { align: 'center' }
            );
          }
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;

        if (table.data.length > 50) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'italic');
          doc.text(`Note: Showing first 50 of ${table.data.length} items. Full data available in Excel export.`, 20, yPosition);
          yPosition += 10;
        }
      });
    }

    // Save the PDF
    doc.save(`${filename}.pdf`);
  }

  async exportToCSV(options: ExportOptions): Promise<void> {
    const { tables, filename, columns, data, department, classification } = options;

    // Support legacy single table export
    const exportTables = tables || (data && department && classification ? [{
      id: `${department}_${classification}`,
      department,
      classification,
      data,
      stats: { totalItems: 0, lowStockItems: 0, outOfStockItems: 0, expiredItems: 0 }
    }] : []);

    let csvContent = '';

    if (exportTables.length === 1) {
      // Single table export
      const table = exportTables[0];

      // Add headers
      csvContent += `MEDITRACK INVENTORY REPORT - ${table.department.charAt(0).toUpperCase() + table.department.slice(1)} ${table.classification.charAt(0).toUpperCase() + table.classification.slice(1)}\n`;
      csvContent += `Generated: ${this.formatDate(new Date())}\n`;
      csvContent += `Total Items: ${table.data.length}\n\n`;

      const headers = columns.map(col => col.header).join(',');
      const rows = table.data.map(item =>
        columns.map(col => {
          const value = item[col.key];
          let formattedValue = '';

          if (col.formatter) {
            formattedValue = col.formatter(value);
          } else if (col.key === 'status') {
            formattedValue = this.formatStatus(value || 'Unknown');
          } else {
            formattedValue = value || '';
          }

          // Escape commas and quotes in CSV
          if (formattedValue.toString().includes(',') || formattedValue.toString().includes('"')) {
            formattedValue = `"${formattedValue.toString().replace(/"/g, '""')}"`;
          }

          return formattedValue;
        }).join(',')
      );

      csvContent += [headers, ...rows].join('\n');
    } else {
      // Multiple tables export
      csvContent += 'MEDITRACK MULTI-TABLE INVENTORY REPORT\n';
      csvContent += `Generated: ${this.formatDate(new Date())}\n`;
      csvContent += `Total Tables: ${exportTables.length}\n\n`;

      exportTables.forEach((table, index) => {
        csvContent += `\n=== ${table.department.charAt(0).toUpperCase() + table.department.slice(1)} - ${table.classification.charAt(0).toUpperCase() + table.classification.slice(1)} ===\n`;
        csvContent += `Total Items: ${table.data.length}\n\n`;

        const headers = columns.map(col => col.header).join(',');
        const rows = table.data.map(item =>
          columns.map(col => {
            const value = item[col.key];
            let formattedValue = '';

            if (col.formatter) {
              formattedValue = col.formatter(value);
            } else if (col.key === 'status') {
              formattedValue = this.formatStatus(value || 'Unknown');
            } else {
              formattedValue = value || '';
            }

            // Escape commas and quotes in CSV
            if (formattedValue.toString().includes(',') || formattedValue.toString().includes('"')) {
              formattedValue = `"${formattedValue.toString().replace(/"/g, '""')}"`;
            }

            return formattedValue;
          }).join(',')
        );

        csvContent += [headers, ...rows].join('\n');

        if (index < exportTables.length - 1) {
          csvContent += '\n\n';
        }
      });
    }

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private async exportToDocx(options: ExportOptions): Promise<void> {
    const isMultiTable = options.tables && options.tables.length > 0;

    // Document sections
    const documentSections: any[] = [];

    // Header
    const header = new Header({
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: "MediTrack - Healthcare Management System",
              bold: true,
              size: 20,
              color: "1e40af"
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
      ],
    });

    // Footer
    const footer = new Footer({
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: `Generated on ${this.formatDate(new Date())} | Page `,
              size: 18,
              color: "666666"
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
      ],
    });

    // Title
    documentSections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: options.title,
            bold: true,
            size: 32,
            color: "1e40af"
          }),
        ],
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );

    // Generation info
    documentSections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Generated on: ${this.formatDate(new Date())}`,
            size: 22,
            color: "666666"
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
      })
    );

    if (isMultiTable) {
      // Multi-table export
      const tables = options.tables!;

      // Summary section
      documentSections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Executive Summary",
              bold: true,
              size: 28,
              color: "1e40af"
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      );

      // Overall statistics
      const totalItems = tables.reduce((sum, table) => sum + table.stats.totalItems, 0);
      const totalLowStock = tables.reduce((sum, table) => sum + table.stats.lowStockItems, 0);
      const totalOutOfStock = tables.reduce((sum, table) => sum + table.stats.outOfStockItems, 0);

      documentSections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Total Items Across All Departments: ${totalItems}`,
              size: 22,
            }),
          ],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Items Requiring Attention: ${totalLowStock + totalOutOfStock}`,
              size: 22,
              color: totalLowStock + totalOutOfStock > 0 ? "dc2626" : "059669"
            }),
          ],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Low Stock Items: ${totalLowStock}`,
              size: 20,
              color: totalLowStock > 0 ? "d97706" : "059669"
            }),
          ],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Out of Stock Items: ${totalOutOfStock}`,
              size: 20,
              color: totalOutOfStock > 0 ? "dc2626" : "059669"
            }),
          ],
          spacing: { after: 400 },
        })
      );

      // Individual table sections
      tables.forEach((table, index) => {
        documentSections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${table.department.charAt(0).toUpperCase() + table.department.slice(1)} Department - ${table.classification}`,
                bold: true,
                size: 24,
                color: "1e40af"
              }),
            ],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 600, after: 200 },
          })
        );

        // Table statistics
        documentSections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Total Items: ${table.stats.totalItems} | `,
                size: 20,
              }),
              new TextRun({
                text: `Low Stock: ${table.stats.lowStockItems} | `,
                size: 20,
                color: table.stats.lowStockItems > 0 ? "d97706" : "059669"
              }),
              new TextRun({
                text: `Out of Stock: ${table.stats.outOfStockItems}`,
                size: 20,
                color: table.stats.outOfStockItems > 0 ? "dc2626" : "059669"
              }),
            ],
            spacing: { after: 200 },
          })
        );

        // Create table
        const tableRows = this.createDocxTable(table.data, options.columns);
        if (tableRows.length > 0) {
          const docxTable = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows,
          });
          documentSections.push(docxTable);
        }
      });
    } else {
      // Single table export
      const data = options.data || [];

      if (options.includeStats && options.stats) {
        documentSections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "Inventory Statistics",
                bold: true,
                size: 24,
                color: "1e40af"
              }),
            ],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          })
        );

        documentSections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Total Items: ${options.stats.totalItems} | `,
                size: 20,
              }),
              new TextRun({
                text: `Low Stock: ${options.stats.lowStockItems} | `,
                size: 20,
                color: options.stats.lowStockItems > 0 ? "d97706" : "059669"
              }),
              new TextRun({
                text: `Out of Stock: ${options.stats.outOfStockItems}`,
                size: 20,
                color: options.stats.outOfStockItems > 0 ? "dc2626" : "059669"
              }),
            ],
            spacing: { after: 400 },
          })
        );
      }

      // Create table
      const tableRows = this.createDocxTable(data, options.columns);
      if (tableRows.length > 0) {
        const docxTable = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows,
        });
        documentSections.push(docxTable);
      }
    }

    // Create document
    const doc = new Document({
      sections: [{
        headers: { default: header },
        footers: { default: footer },
        children: documentSections,
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
      }],
    });

    // Generate and save
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${options.filename}.docx`);
  }

  private createDocxTable(data: any[], columns: ColumnConfig[]): TableRow[] {
    const rows: TableRow[] = [];

    // Header row
    const headerCells = columns.map(col =>
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: col.header,
                bold: true,
                size: 20,
                color: "ffffff"
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
        shading: { fill: "1e40af" },
      })
    );

    rows.push(new TableRow({ children: headerCells }));

    // Data rows
    data.forEach((item, index) => {
      const cells = columns.map(col => {
        let value = item[col.key];
        if (col.formatter) {
          value = col.formatter(value);
        } else if (value === null || value === undefined) {
          value = '';
        } else {
          value = String(value);
        }

        // Determine text color based on status
        let textColor = "000000";
        if (col.key === 'status') {
          switch (value) {
            case 'low_stock':
            case 'low stock':
              textColor = "d97706";
              break;
            case 'out_of_stock':
            case 'out of stock':
              textColor = "dc2626";
              break;
            case 'expired':
              textColor = "dc2626";
              break;
            case 'maintenance':
              textColor = "d97706";
              break;
            default:
              textColor = "059669";
          }
        }

        return new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: value,
                  size: 18,
                  color: textColor
                }),
              ],
              alignment: AlignmentType.LEFT,
            }),
          ],
          shading: { fill: index % 2 === 0 ? "ffffff" : "f8fafc" },
        });
      });

      rows.push(new TableRow({ children: cells }));
    });

    return rows;
  }

  async exportData(options: ExportOptions): Promise<void> {
    try {
      switch (options.format) {
        case 'excel':
          await this.exportToExcel(options);
          break;
        case 'pdf':
          await this.exportToPDF(options);
          break;
        case 'csv':
          await this.exportToCSV(options);
          break;
        case 'docx':
          await this.exportToDocx(options);
          break;
        default:
          throw new Error('Unsupported export format');
      }
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  }
}

export const exportService = new ExportService();