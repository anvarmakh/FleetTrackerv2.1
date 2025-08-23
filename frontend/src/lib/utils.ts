import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get timezone abbreviation (e.g., "CST", "EST", "UTC")
 * @param timezone - IANA timezone string
 * @returns Timezone abbreviation
 */
export function getTimezoneAbbreviation(timezone: string): string {
  try {
    const date = new Date();
    const options: Intl.DateTimeFormatOptions = { timeZoneName: 'short' };
    const timeZoneName = date.toLocaleString('en-US', { timeZone: timezone, ...options });
    
    // Extract timezone abbreviation from the formatted string
    const match = timeZoneName.match(/\s([A-Z]{3,4})$/);
    return match ? match[1] : timezone.split('/').pop()?.toUpperCase() || timezone;
  } catch (error) {
    console.error('Error getting timezone abbreviation:', error);
    return timezone.split('/').pop()?.toUpperCase() || timezone;
  }
}

/**
 * Format date using user's preferred timezone with timezone indicator
 * @param dateString - ISO date string from backend
 * @param timezone - User's preferred timezone (e.g., 'America/Chicago')
 * @param options - Intl.DateTimeFormatOptions
 * @param showTimezone - Whether to show timezone indicator
 * @returns Formatted date string with optional timezone indicator
 */
export function formatDateInTimezone(
  dateString: string | Date,
  timezone: string = 'America/Chicago',
  options: Intl.DateTimeFormatOptions = {},
  showTimezone: boolean = true
): string {
  if (!dateString) return 'Never';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    const formattedDate = date.toLocaleString('en-US', {
      timeZone: timezone,
      ...options
    });
    
    if (showTimezone) {
      const tzAbbr = getTimezoneAbbreviation(timezone);
      return `${formattedDate} (${tzAbbr})`;
    }
    
    return formattedDate;
  } catch (error) {
    console.error('Error formatting date with timezone:', error);
    return new Date(dateString).toLocaleString();
  }
}

/**
 * Format date only (without time) using user's preferred timezone with timezone indicator
 * @param dateString - ISO date string from backend
 * @param timezone - User's preferred timezone
 * @param showTimezone - Whether to show timezone indicator
 * @returns Formatted date string with optional timezone indicator
 */
export function formatDateOnlyInTimezone(
  dateString: string | Date,
  timezone: string = 'America/Chicago',
  showTimezone: boolean = true
): string {
  return formatDateInTimezone(dateString, timezone, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }, showTimezone);
}

/**
 * Format relative time (e.g., "2h ago") using user's preferred timezone with timezone indicator
 * @param dateString - ISO date string from backend
 * @param timezone - User's preferred timezone
 * @param showTimezone - Whether to show timezone indicator
 * @returns Relative time string with optional timezone indicator
 */
export function formatRelativeTimeInTimezone(
  dateString: string | Date,
  timezone: string = 'America/Chicago',
  showTimezone: boolean = true
): string {
  if (!dateString) return 'Never';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    // Create a date in the user's timezone for comparison
    const now = new Date();
    const userTimezoneDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    const userTimezoneNow = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    
    const diffInHours = (userTimezoneNow.getTime() - userTimezoneDate.getTime()) / (1000 * 60 * 60);
    
    let relativeTime: string;
    if (diffInHours < 1) relativeTime = '< 1h ago';
    else if (diffInHours < 24) relativeTime = `${Math.floor(diffInHours)}h ago`;
    else relativeTime = `${Math.floor(diffInHours / 24)}d ago`;
    
    if (showTimezone) {
      const tzAbbr = getTimezoneAbbreviation(timezone);
      return `${relativeTime} (${tzAbbr})`;
    }
    
    return relativeTime;
  } catch (error) {
    console.error('Error formatting relative time with timezone:', error);
    // Fallback to simple calculation
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    let relativeTime: string;
    if (diffInHours < 1) relativeTime = '< 1h ago';
    else if (diffInHours < 24) relativeTime = `${Math.floor(diffInHours)}h ago`;
    else relativeTime = `${Math.floor(diffInHours / 24)}d ago`;
    
    if (showTimezone) {
      const tzAbbr = getTimezoneAbbreviation(timezone);
      return `${relativeTime} (${tzAbbr})`;
    }
    
    return relativeTime;
  }
}
