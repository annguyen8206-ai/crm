/**
 * Utility functions for Vietnamese Date formatting (Ngày/Tháng/Năm - DD/MM/YYYY)
 */

export function formatDateVN(dateInput?: string | Date | null, includePrefix = false): string {
  if (!dateInput) return '';

  let date: Date;
  if (typeof dateInput === 'string') {
    // If it's pure YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
      const [y, m, d] = dateInput.trim().split('-');
      return includePrefix ? `Ngày ${d}/${m}/${y}` : `${d}/${m}/${y}`;
    }

    // If already in DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateInput.trim())) {
      return includePrefix ? `Ngày ${dateInput.trim()}` : dateInput.trim();
    }

    // Try parsing
    date = new Date(dateInput);
  } else {
    date = dateInput;
  }

  if (isNaN(date.getTime())) {
    return String(dateInput);
  }

  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();

  return includePrefix ? `Ngày ${d}/${m}/${y}` : `${d}/${m}/${y}`;
}

export function formatDateTimeVN(dateInput?: string | Date | null): string {
  if (!dateInput) return '';

  if (typeof dateInput === 'string') {
    // Handles 'YYYY-MM-DD HH:mm' or 'YYYY-MM-DDTHH:mm'
    const clean = dateInput.replace('T', ' ').trim();
    const parts = clean.split(' ');
    if (parts.length === 2 && /^\d{4}-\d{2}-\d{2}$/.test(parts[0])) {
      const [y, m, d] = parts[0].split('-');
      return `${parts[1]} ${d}/${m}/${y}`;
    }
  }

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return String(dateInput);

  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');

  return `${hours}:${mins} - ${d}/${m}/${y}`;
}

export function formatDateWordsVN(dateInput?: string | Date | null): string {
  if (!dateInput) return '';

  let d = '';
  let m = '';
  let y = '';

  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateInput.trim())) {
    const parts = dateInput.trim().split(/[- T]/);
    y = parts[0];
    m = parts[1];
    d = parts[2];
  } else {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return String(dateInput);
    d = String(date.getDate()).padStart(2, '0');
    m = String(date.getMonth() + 1).padStart(2, '0');
    y = String(date.getFullYear());
  }

  return `Ngày ${d} Tháng ${m} Năm ${y}`;
}
