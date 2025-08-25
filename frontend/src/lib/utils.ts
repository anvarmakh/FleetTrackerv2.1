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

/**
 * Extract city and state from address string
 * Handles various address formats and returns standardized city, state format
 * @param address - Address string to parse
 * @returns Formatted city, state string or fallback text
 */
export function extractCityState(address: string | null | undefined): string {
  if (!address || address.trim() === '') {
    return 'Location unavailable';
  }
  
  // Check if address is a JSON string and parse it
  if (address.startsWith('{') && address.endsWith('}')) {
    try {
      const parsed = JSON.parse(address);
      if (parsed.city && parsed.state) {
        return `${parsed.city}, ${parsed.state}`;
      }
      if (parsed.street && parsed.city && parsed.state) {
        return `${parsed.city}, ${parsed.state}`;
      }
    } catch (e) {
      // If parsing fails, continue with string parsing
    }
  }
  
  // Remove extra whitespace and normalize
  const cleanAddress = address.trim();
  
  // Handle truncated addresses (ending with "...")
  const isTruncated = cleanAddress.endsWith('...');
  const addressToProcess = isTruncated ? cleanAddress.slice(0, -3) : cleanAddress;
  
  // Pattern 1: Handle plus codes like "V445+PQ Commerce City, CO, USA"
  const plusCodePattern = /^[A-Z0-9]{4}\+[A-Z0-9]{2,3}\s+(.+?),\s*([A-Z]{2})/;
  const plusCodeMatch = addressToProcess.match(plusCodePattern);
  if (plusCodeMatch) {
    const city = plusCodeMatch[1];
    const state = plusCodeMatch[2];
    return `${city}, ${state}`;
  }
  
  // Pattern 2: Handle highway addresses like "I-80, Alta, CA 95701, USA"
  const highwayPattern = /^(I-|US-|TX-|CA-|FL-|IL-|NY-|OH-|TX-|AR-|WY-|NE-|NV-|MO-|AZ-|NC-|KY-|OR-|ID-|CO-)[^,]*,\s*(.+?),\s*([A-Z]{2})/;
  const highwayMatch = addressToProcess.match(highwayPattern);
  if (highwayMatch) {
    const city = highwayMatch[2];
    const state = highwayMatch[3];
    return `${city}, ${state}`;
  }
  
  // Pattern 3: "Street, City, State ZIP" or "Street, City, State, Country"
  if (addressToProcess.includes(',')) {
    const parts = addressToProcess.split(',').map(part => part.trim());
    
    // Handle "Street, City, State ZIP, Country" format (4 parts)
    if (parts.length >= 4) {
      // Look for city (second part) and state (third part)
      const city = parts[1];
      const statePart = parts[2];
      
      // Extract state from "State ZIP" format
      const state = statePart.split(' ')[0];
      
      // Validate state is likely a state abbreviation
      if (state && state.length <= 3 && state !== 'US' && /^[A-Z]{2}$/.test(state)) {
        return `${city}, ${state}`;
      }
    } else if (parts.length === 3) {
      // "Street, City, State ZIP" format (e.g., "8375 Merrill Ave, Chino, CA 91710")
      const city = parts[1];
      const statePart = parts[2];
      
      // Extract state from "State ZIP" format
      const state = statePart.split(' ')[0];
      
      if (state && state.length <= 3 && state !== 'US' && /^[A-Z]{2}$/.test(state)) {
        return `${city}, ${state}`;
      }
    } else if (parts.length === 2) {
      // "City, State" format
      const city = parts[0];
      const state = parts[1];
      const cleanState = state.split(' ')[0];
      if (cleanState && cleanState.length <= 3 && cleanState !== 'US' && /^[A-Z]{2}$/.test(cleanState)) {
        return `${city}, ${cleanState}`;
      }
    }
  }
  
  // Pattern 4: "City State" (no comma)
  if (addressToProcess.includes(' ')) {
    const parts = addressToProcess.split(' ');
    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1];
      if (lastPart.length <= 3 && lastPart !== 'US' && /^[A-Z]{2}$/.test(lastPart)) {
        const city = parts.slice(0, -1).join(' ');
        return `${city}, ${lastPart}`;
      }
    }
  }
  
  // Pattern 5: Handle addresses with plus codes in the middle
  const complexPlusCodePattern = /^[^,]*,\s*(.+?),\s*([A-Z]{2})/;
  const complexMatch = addressToProcess.match(complexPlusCodePattern);
  if (complexMatch) {
    const city = complexMatch[1];
    const state = complexMatch[2];
    // Additional validation to ensure we're not getting a plus code as city
    if (!city.includes('+') && city.length > 2) {
      return `${city}, ${state}`;
    }
  }
  
  // If we can't parse it properly, try to extract any recognizable city/state pattern
  const statePattern = /\b([A-Z]{2})\b/;
  const stateMatch = addressToProcess.match(statePattern);
  
  if (stateMatch) {
    const state = stateMatch[1];
    // Try to find a city before the state
    const beforeState = addressToProcess.substring(0, stateMatch.index).trim();
    if (beforeState) {
      // Take the last part before the state as the city
      const cityParts = beforeState.split(/[,\s]+/);
      const city = cityParts[cityParts.length - 1];
      if (city && city.length > 1 && !city.includes('+')) {
        return `${city}, ${state}`;
      }
    }
  }
  
  return cleanAddress || 'Location unavailable';
}

/**
 * Format address for display (legacy function for backward compatibility)
 * @param address - Address string to format
 * @returns Formatted address string
 */
export function formatAddress(address: string | null | undefined): string {
  return extractCityState(address);
}
