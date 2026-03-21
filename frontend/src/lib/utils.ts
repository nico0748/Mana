import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Builds a single Tailwind-compatible class string from multiple class inputs.
 *
 * @param inputs - One or more class values (strings, arrays, objects, etc.) to combine
 * @returns The resulting class string with conflicting Tailwind classes merged and resolved
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
