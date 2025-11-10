import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Opportunity } from "@/types/opportunity";
import { format } from "date-fns";

export const exportToCSV = (opportunities: Opportunity[], filename: string = "opportunities.csv") => {
  const headers = [
    "Title",
    "Agency",
    "State",
    "County",
    "City",
    "Contract Type",
    "Priority",
    "Status",
    "Service Tags",
    "Est. Value Min",
    "Est. Value Max",
    "Issue Date",
    "Proposal Due",
    "Source",
    "Link",
  ];

  const rows = opportunities.map((opp) => [
    opp.title,
    opp.agency,
    opp.geography.state,
    opp.geography.county || "",
    opp.geography.city || "",
    opp.contractType,
    opp.priority,
    opp.status,
    opp.serviceTags.join("; "),
    opp.estimatedValue?.min || "",
    opp.estimatedValue?.max || "",
    opp.keyDates.issueDate || "",
    opp.keyDates.proposalDue,
    opp.source,
    opp.link,
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToPDF = (opportunities: Opportunity[], filename: string = "opportunities.pdf") => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.text("Opportunity Report", 14, 20);
  
  // Date
  doc.setFontSize(10);
  doc.text(`Generated: ${format(new Date(), "PPP")}`, 14, 28);
  doc.text(`Total Opportunities: ${opportunities.length}`, 14, 34);

  // Prepare table data
  const tableData = opportunities.map((opp) => [
    opp.title.substring(0, 40) + (opp.title.length > 40 ? "..." : ""),
    opp.agency.substring(0, 25) + (opp.agency.length > 25 ? "..." : ""),
    `${opp.geography.city || ""}, ${opp.geography.state}`,
    opp.contractType,
    opp.priority.toUpperCase(),
    opp.keyDates.proposalDue,
  ]);

  autoTable(doc, {
    startY: 40,
    head: [["Title", "Agency", "Location", "Type", "Priority", "Due Date"]],
    body: tableData,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [59, 130, 246] },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 35 },
      2: { cellWidth: 30 },
      3: { cellWidth: 25 },
      4: { cellWidth: 20 },
      5: { cellWidth: 25 },
    },
  });

  doc.save(filename);
};
