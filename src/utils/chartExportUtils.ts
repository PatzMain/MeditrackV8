import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export interface ChartExportData {
  title: string;
  subtitle?: string;
  data: any[];
  chartElement: HTMLElement;
}

export class ChartExportUtils {
  private static async captureChartImage(element: HTMLElement): Promise<string | null> {
    try {
      // Wait a bit for any animations to finish
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 1.5,
        useCORS: true,
        allowTaint: false,
        foreignObjectRendering: false,
        imageTimeout: 10000,
        removeContainer: false,
        logging: false,
        width: element.offsetWidth,
        height: element.offsetHeight,
      });

      return canvas.toDataURL('image/png', 0.8);
    } catch (error) {
      console.warn('Could not capture chart image:', error);
      return null;
    }
  }

  static async exportChartToPDF(exportData: ChartExportData): Promise<void> {
    try {
      const { title, subtitle, data, chartElement } = exportData;

      // Validate inputs
      if (!title || !chartElement) {
        throw new Error('Missing required export data (title or chart element)');
      }

      const pdf = new jsPDF('p', 'mm', 'a4');
      let yPosition = 20;

      // Add title
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      const titleLines = pdf.splitTextToSize(title, 170);
      pdf.text(titleLines, 20, yPosition);
      yPosition += (titleLines.length * 8) + 5;

      // Add subtitle if provided
      if (subtitle) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        const subtitleLines = pdf.splitTextToSize(subtitle, 170);
        pdf.text(subtitleLines, 20, yPosition);
        yPosition += (subtitleLines.length * 6) + 10;
      }

      // Try to capture and add chart image
      const chartImageData = await this.captureChartImage(chartElement);
      if (chartImageData) {
        try {
          const imgWidth = 170;
          const imgHeight = 90;

          // Check if we need a new page
          if (yPosition + imgHeight > 250) {
            pdf.addPage();
            yPosition = 20;
          }

          pdf.addImage(chartImageData, 'PNG', 20, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 15;
        } catch (imageError) {
          console.warn('Could not add image to PDF:', imageError);
          // Add note about missing chart
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'italic');
          pdf.text('[Chart visualization could not be captured]', 20, yPosition);
          yPosition += 10;
        }
      } else {
        // Add note about missing chart
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'italic');
        pdf.text('[Chart visualization could not be captured - please view in application]', 20, yPosition);
        yPosition += 15;
      }

      // Add data table if available
      if (data && Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
        try {
          const firstRow = data[0];
          const columns = Object.keys(firstRow).map(key => ({
            header: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
            dataKey: key
          }));

          // Check if we need a new page
          if (yPosition > 200) {
            pdf.addPage();
            yPosition = 20;
          }

          pdf.autoTable({
            startY: yPosition,
            columns,
            body: data,
            theme: 'striped',
            headStyles: {
              fillColor: [59, 130, 246],
              textColor: [255, 255, 255],
              fontSize: 10,
              fontStyle: 'bold'
            },
            bodyStyles: {
              fontSize: 9
            },
            margin: { left: 20, right: 20 },
            pageBreak: 'auto',
          });
        } catch (tableError) {
          console.warn('Could not add data table to PDF:', tableError);
          pdf.setFontSize(10);
          pdf.text('Data table could not be generated', 20, yPosition);
        }
      }

      // Generate filename and save
      const filename = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_')}_chart.pdf`;
      pdf.save(filename);

    } catch (error) {
      console.error('Error exporting to PDF:', error);
      throw new Error(`PDF export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async exportChartToDOCX(exportData: ChartExportData): Promise<void> {
    try {
      const { title, subtitle, data } = exportData;

      // Validate inputs
      if (!title) {
        throw new Error('Missing required export data (title)');
      }

      const docParagraphs: Paragraph[] = [];

      // Add title
      docParagraphs.push(
        new Paragraph({
          text: title,
          heading: HeadingLevel.HEADING_1,
        })
      );

      // Add subtitle if provided
      if (subtitle) {
        docParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: subtitle,
                italics: true,
                size: 24,
                color: '666666',
              }),
            ],
          })
        );

        // Add spacing
        docParagraphs.push(new Paragraph({ text: '' }));
      }

      // Note about chart visualization
      docParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Chart Visualization',
              bold: true,
              size: 24,
            }),
          ],
        })
      );

      docParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Please view the interactive chart in the web application for visual representation of this data.',
              italics: true,
              size: 22,
              color: '666666',
            }),
          ],
        })
      );

      // Add spacing
      docParagraphs.push(new Paragraph({ text: '' }));

      // Add data if available
      if (data && Array.isArray(data) && data.length > 0) {
        docParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Data Summary',
                bold: true,
                size: 28,
              }),
            ],
          })
        );

        try {
          // Create a simple data representation
          let dataText = '';

          if (typeof data[0] === 'object') {
            // Handle object data
            const headers = Object.keys(data[0]);
            dataText = headers.join('\t') + '\n';

            data.forEach((item: any) => {
              const values = headers.map(header => {
                const value = item[header];
                return value !== null && value !== undefined ? String(value) : '';
              });
              dataText += values.join('\t') + '\n';
            });
          } else {
            // Handle simple array data
            dataText = data.map((item: any) => String(item)).join('\n');
          }

          docParagraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: dataText,
                  font: 'Courier New',
                  size: 20,
                }),
              ],
            })
          );
        } catch (dataError) {
          console.warn('Could not format data for DOCX:', dataError);
          docParagraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `Data contains ${data.length} items. Please view in the application for detailed information.`,
                  italics: true,
                  size: 22,
                }),
              ],
            })
          );
        }
      }

      // Create document
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: docParagraphs,
          },
        ],
      });

      // Generate and save
      const buffer = await Packer.toBuffer(doc);
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      const filename = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_')}_chart.docx`;
      saveAs(blob, filename);

    } catch (error) {
      console.error('Error exporting to DOCX:', error);
      throw new Error(`DOCX export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async exportChart(
    format: 'pdf' | 'docx',
    exportData: ChartExportData
  ): Promise<void> {
    try {
      // Validate format
      if (!['pdf', 'docx'].includes(format)) {
        throw new Error(`Unsupported export format: ${format}`);
      }

      // Validate export data
      if (!exportData || !exportData.title) {
        throw new Error('Invalid export data provided');
      }

      if (format === 'pdf') {
        await this.exportChartToPDF(exportData);
      } else {
        await this.exportChartToDOCX(exportData);
      }
    } catch (error) {
      console.error(`Error exporting chart as ${format}:`, error);
      throw error;
    }
  }
}