import * as XLSX from 'xlsx';

interface ExportOptions {
  filename: string;
  sheetName?: string;
}

export const exportToExcel = (data: any[], options: ExportOptions) => {
  const { filename, sheetName = 'Sheet1' } = options;
  
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Generate buffer
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  return blob;
};

export const downloadExcel = (data: any[], options: ExportOptions) => {
  const blob = exportToExcel(data, options);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${options.filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const shareToWhatsApp = async (data: any[], options: ExportOptions) => {
  const blob = exportToExcel(data, options);
  
  // Check if Web Share API is available with file sharing
  if (navigator.share && navigator.canShare) {
    const file = new File([blob], `${options.filename}.xlsx`, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: options.filename,
          text: `Sharing ${options.filename}`,
        });
        return true;
      } catch (error) {
        console.log('Share cancelled or failed:', error);
        // Fall back to download
        downloadExcel(data, options);
        return false;
      }
    }
  }
  
  // Fallback: download the file
  downloadExcel(data, options);
  return false;
};
