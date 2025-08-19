// Helper functions to convert between string dates and Date objects
export const stringToDate = (dateString: string): Date | undefined => {
  if (!dateString) return undefined;
  // Parse the date string and create a local date to avoid timezone issues
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day); // month is 0-indexed
  return isNaN(date.getTime()) ? undefined : date;
};

export const dateToString = (date: Date | undefined): string => {
  if (!date) return '';
  // Format the date as YYYY-MM-DD in local timezone
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getCalculatedDate = (calculatedDates: {[key: string]: string}, field: string): string => {
  return calculatedDates[field] || '';
};

export const isDateCalculated = (showCalculatedDates: boolean, calculatedDates: {[key: string]: string}, field: string): boolean => {
  return showCalculatedDates && !!calculatedDates[field];
};
