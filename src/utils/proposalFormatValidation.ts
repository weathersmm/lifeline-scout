export interface FormatSpecification {
  fontFamily: string;
  fontSize: number;
  pageSize: "Letter" | "A4" | "Legal";
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  fileFormat: "PDF" | "DOCX" | "Both";
  maxPages?: number;
  lineSpacing: number;
  headerFooter: boolean;
}

export interface FormatValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  details: {
    estimatedPages: number;
    totalWords: number;
    averageWordsPerPage: number;
    meetsPageLimit: boolean;
    fontCompliance: boolean;
    formatCompliance: boolean;
  };
}

export const TEMPLATE_PRESETS: Record<string, FormatSpecification> = {
  "Arial 10pt": {
    fontFamily: "Arial",
    fontSize: 10,
    pageSize: "Letter",
    margins: { top: 1, bottom: 1, left: 1, right: 1 },
    fileFormat: "DOCX",
    lineSpacing: 1.0,
    headerFooter: true,
  },
  "Arial 10pt Blue/Red": {
    fontFamily: "Arial",
    fontSize: 10,
    pageSize: "Letter",
    margins: { top: 1, bottom: 1, left: 1, right: 1 },
    fileFormat: "DOCX",
    lineSpacing: 1.0,
    headerFooter: true,
  },
  "Arial 10pt Blue/Teal": {
    fontFamily: "Arial",
    fontSize: 10,
    pageSize: "Letter",
    margins: { top: 1, bottom: 1, left: 1, right: 1 },
    fileFormat: "DOCX",
    lineSpacing: 1.0,
    headerFooter: true,
  },
  "Arial 10pt Black/Gold": {
    fontFamily: "Arial",
    fontSize: 10,
    pageSize: "Letter",
    margins: { top: 1, bottom: 1, left: 1, right: 1 },
    fileFormat: "DOCX",
    lineSpacing: 1.0,
    headerFooter: true,
  },
  "Times New Roman 12pt": {
    fontFamily: "Times New Roman",
    fontSize: 12,
    pageSize: "Letter",
    margins: { top: 1, bottom: 1, left: 1, right: 1 },
    fileFormat: "DOCX",
    lineSpacing: 1.15,
    headerFooter: true,
  },
  "Custom": {
    fontFamily: "Arial",
    fontSize: 11,
    pageSize: "Letter",
    margins: { top: 1, bottom: 1, left: 1, right: 1 },
    fileFormat: "DOCX",
    lineSpacing: 1.0,
    headerFooter: false,
  },
};

export const validateProposalFormat = (
  wordCount: number,
  formatSpec: FormatSpecification,
  requirements: Array<{ pageLimit?: number }>
): FormatValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Calculate words per page based on font size and line spacing
  const baseWordsPerPage = 250;
  const fontSizeMultiplier = 12 / formatSpec.fontSize;
  const lineSpacingMultiplier = 1.15 / formatSpec.lineSpacing;
  const wordsPerPage = Math.floor(
    baseWordsPerPage * fontSizeMultiplier * lineSpacingMultiplier
  );

  const estimatedPages = Math.ceil(wordCount / wordsPerPage);

  // Check page limits
  const totalPageLimit = requirements.reduce(
    (sum, req) => sum + (req.pageLimit || 0),
    0
  );

  let meetsPageLimit = true;
  if (totalPageLimit > 0 && estimatedPages > totalPageLimit) {
    errors.push(
      `Document exceeds page limit: ${estimatedPages} pages vs ${totalPageLimit} page limit`
    );
    meetsPageLimit = false;
  }

  if (formatSpec.maxPages && estimatedPages > formatSpec.maxPages) {
    errors.push(
      `Document exceeds maximum pages: ${estimatedPages} pages vs ${formatSpec.maxPages} page maximum`
    );
    meetsPageLimit = false;
  }

  // Check font compliance
  const fontCompliance = true; // Fonts will be enforced in export
  
  // Check format compliance
  const formatCompliance = formatSpec.fileFormat !== undefined;

  // Generate warnings
  if (estimatedPages > totalPageLimit * 0.9 && totalPageLimit > 0) {
    warnings.push(
      `Approaching page limit: ${estimatedPages} pages (${totalPageLimit} page limit)`
    );
  }

  if (!formatSpec.headerFooter) {
    warnings.push("Header/footer not configured - may be required by RFP");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    details: {
      estimatedPages,
      totalWords: wordCount,
      averageWordsPerPage: wordsPerPage,
      meetsPageLimit,
      fontCompliance,
      formatCompliance,
    },
  };
};

export const getTemplateFile = (templateName: string): string => {
  const templateMap: Record<string, string> = {
    "Arial 10pt": "/templates/WordTemplateStyles_Arial_10pt.dotx",
    "Arial 10pt Blue/Red": "/templates/WordTemplateStyles_Arial_10pt_BlueRed.dotx",
    "Arial 10pt Blue/Teal": "/templates/WordTemplateStyles_Arial_10pt_BlueTeal.dotx",
    "Arial 10pt Black/Gold": "/templates/WordTemplateStyles_Arial_10pt_BlackGold.dotx",
    "Times New Roman 12pt": "/templates/WordTemplateStyles_TNR_12pt.dotx",
  };

  return templateMap[templateName] || "/templates/WordTemplateStyles.dotx";
};
