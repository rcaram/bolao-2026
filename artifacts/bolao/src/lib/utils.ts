import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isPast, formatDistanceToNowStrict } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string) {
  return format(new Date(dateString), "MMM d, HH:mm");
}

export function getTimeUntil(dateString: string) {
  const date = new Date(dateString);
  if (isPast(date)) return "Locked";
  return formatDistanceToNowStrict(date) + " left";
}

export function isBettingLocked(deadlineStr: string) {
  return isPast(new Date(deadlineStr));
}

export function formatStage(stage: string) {
  return stage
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
