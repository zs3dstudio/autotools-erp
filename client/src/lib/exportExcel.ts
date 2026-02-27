/**
 * Export an array of objects to an Excel (.xlsx) file and trigger download.
 * Note: This is a Phase-1 feature. XLSX library needs to be installed for full functionality.
 * @param data - Array of row objects
 * @param sheetName - Name of the worksheet
 * @param fileName - Filename without extension
 */
export function exportToExcel(
  data: Record<string, unknown>[],
  sheetName: string = "Sheet1",
  fileName: string = "export"
): void {
  // Stub implementation - Phase-1 feature
  console.warn("Excel export requires 'xlsx' package to be installed");
  // In production, install xlsx and uncomment the implementation below:
  // const XLSX = require('xlsx');
  // const ws = XLSX.utils.json_to_sheet(data);
  // const wb = XLSX.utils.book_new();
  // XLSX.utils.book_append_sheet(wb, ws, sheetName);
  // XLSX.writeFile(wb, `${fileName}.xlsx`);
}

/**
 * Export multiple sheets into a single Excel workbook.
 * Note: This is a Phase-1 feature. XLSX library needs to be installed for full functionality.
 * @param sheets - Array of { name, data } objects
 * @param fileName - Filename without extension
 */
export function exportMultiSheetExcel(
  sheets: { name: string; data: Record<string, unknown>[] }[],
  fileName: string
): void {
  // Stub implementation - Phase-1 feature
  console.warn("Excel export requires 'xlsx' package to be installed");
  // In production, install xlsx and uncomment the implementation below:
  // const XLSX = require('xlsx');
  // const workbook = XLSX.utils.book_new();
  // for (const sheet of sheets) {
  //   if (!sheet.data || sheet.data.length === 0) continue;
  //   const worksheet = XLSX.utils.json_to_sheet(sheet.data);
  //   const colWidths = Object.keys(sheet.data[0]).map((key) => ({
  //     wch: Math.max(
  //       key.length,
  //       ...sheet.data.map((row) => String(row[key] ?? "").length)
  //     ) + 2,
  //   }));
  //   worksheet["!cols"] = colWidths;
  //   XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  // }
  // XLSX.writeFile(workbook, `${fileName}.xlsx`);
}
