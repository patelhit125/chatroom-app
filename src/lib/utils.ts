import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(date: Date | string): string {
  const d = new Date(date);
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) {
    return "Today";
  } else if (d.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  } else {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
}

export function formatPoints(points: number): string {
  return points.toFixed(2);
}

export function formatMinutes(minutes: number): string {
  if (minutes < 1) {
    return "< 1 min";
  }
  return `${minutes} min${minutes !== 1 ? "s" : ""}`;
}

export function formatSeconds(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} sec${seconds !== 1 ? "s" : ""}`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) {
    return `${minutes} min${minutes !== 1 ? "s" : ""}`;
  }
  return `${minutes} min ${remainingSeconds} sec${
    remainingSeconds !== 1 ? "s" : ""
  }`;
}
