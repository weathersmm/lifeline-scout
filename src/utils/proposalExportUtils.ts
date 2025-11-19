import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } from "docx";
import { saveAs } from "file-saver";
import { TEMPLATE_PRESETS } from "./proposalFormatValidation";

interface ContentBlock {
  id: string;
  title: string;
  content: string;
  content_type: string;
}

interface RequirementMapping {
  id: string;
  requirementId: string;
  requirementText: string;
  category?: string;
  pageLimit?: number;
  contentBlockIds: string[];
  contentBlocks: ContentBlock[];
  customContent: string;
  wordCount: number;
  isComplete: boolean;
}

export const exportProposalToPDF = (
  opportunityTitle: string,
  requirements: RequirementMapping[],
  filename: string = "proposal.pdf"
) => {
  const doc = new jsPDF();
  let yPosition = 20;

  // Title
  doc.setFontSize(18);
  doc.text("Proposal Response", 14, yPosition);
  yPosition += 10;

  doc.setFontSize(12);
  doc.text(opportunityTitle, 14, yPosition);
  yPosition += 15;

  // Iterate through requirements
  requirements.forEach((req, index) => {
    // Check if we need a new page
    if (yPosition > 270) {
      doc.addPage();
      yPosition = 20;
    }

    // Requirement header
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`${req.requirementId}: ${req.requirementText.substring(0, 80)}...`, 14, yPosition);
    yPosition += 8;

    if (req.category) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.text(`Category: ${req.category}`, 14, yPosition);
      yPosition += 6;
    }

    if (req.pageLimit) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Page Limit: ${req.pageLimit} pages (Current: ~${(req.wordCount / 250).toFixed(1)} pages)`, 14, yPosition);
      yPosition += 8;
    }

    // Content blocks
    req.contentBlocks.forEach((block) => {
      if (yPosition > 260) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`• ${block.title}`, 14, yPosition);
      yPosition += 6;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const contentLines = doc.splitTextToSize(block.content.substring(0, 500), 180);
      contentLines.forEach((line: string) => {
        if (yPosition > 280) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(line, 18, yPosition);
        yPosition += 5;
      });
      yPosition += 3;
    });

    // Custom content
    if (req.customContent) {
      if (yPosition > 260) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Custom Content:", 14, yPosition);
      yPosition += 6;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const customLines = doc.splitTextToSize(req.customContent.substring(0, 500), 180);
      customLines.forEach((line: string) => {
        if (yPosition > 280) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(line, 18, yPosition);
        yPosition += 5;
      });
    }

    yPosition += 10;
  });

  doc.save(filename);
};

export const exportProposalToDOCX = async (
  opportunityTitle: string,
  requirements: RequirementMapping[],
  filename: string = "proposal.docx",
  templateName: string = "Arial 10pt"
) => {
  const formatSpec = TEMPLATE_PRESETS[templateName];
  const children: Paragraph[] = [];
  
  // Determine font based on template
  const fontFamily = formatSpec.fontFamily;
  const fontSize = formatSpec.fontSize * 2; // Convert to half-points for docx

  // Title with template formatting
  children.push(
    new Paragraph({
      text: "Proposal Response",
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  children.push(
    new Paragraph({
      text: opportunityTitle,
      heading: HeadingLevel.HEADING_2,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Iterate through requirements
  requirements.forEach((req) => {
    // Requirement header
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${req.requirementId}: ${req.requirementText}`,
            bold: true,
            size: fontSize + 4,
            font: fontFamily,
          }),
        ],
        spacing: { before: 300, after: 100 },
      })
    );

    if (req.category) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Category: ${req.category}`,
              italics: true,
              size: fontSize - 4,
              font: fontFamily,
            }),
          ],
          spacing: { after: 100 },
        })
      );
    }

    if (req.pageLimit) {
      const estimatedPages = (req.wordCount / 250).toFixed(1);
      const isOverLimit = req.pageLimit > 0 && parseFloat(estimatedPages) > req.pageLimit;
      
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Page Limit: ${req.pageLimit} pages | Current: ~${estimatedPages} pages | Word Count: ${req.wordCount}`,
              size: fontSize - 4,
              font: fontFamily,
              color: isOverLimit ? "FF0000" : "000000",
            }),
          ],
          spacing: { after: 200 },
        })
      );
    }

    // Content blocks
    req.contentBlocks.forEach((block) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: block.title,
              bold: true,
              size: fontSize,
              font: fontFamily,
            }),
          ],
          spacing: { before: 200, after: 100 },
          bullet: { level: 0 },
        })
      );

      children.push(
        new Paragraph({
          text: block.content,
          spacing: { after: 200 },
        })
      );
    });

    // Custom content
    if (req.customContent) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Custom Content",
              bold: true,
              size: fontSize,
              font: fontFamily,
            }),
          ],
          spacing: { before: 200, after: 100 },
        })
      );

      children.push(
        new Paragraph({
          text: req.customContent,
          spacing: { after: 300 },
        })
      );
    }
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: formatSpec.pageSize === "Letter" ? 12240 : 11906,
              height: formatSpec.pageSize === "Letter" ? 15840 : 16838,
            },
            margin: {
              top: formatSpec.margins.top * 1440,
              bottom: formatSpec.margins.bottom * 1440,
              left: formatSpec.margins.left * 1440,
              right: formatSpec.margins.right * 1440,
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
};
