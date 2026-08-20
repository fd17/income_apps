/**
 * Waitlist domain logic + a small file-backed store.
 *
 * The pure helpers (`normalizeEmail`, `isValidEmail`, `addEmail`) contain all
 * the business rules and are unit-tested without any I/O. The file-backed
 * functions at the bottom are the server-side persistence layer used by the
 * API route.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

export interface WaitlistData {
  emails: string[];
}

export interface JoinResult {
  emails: string[];
  added: boolean;
  position: number;
  total: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  const value = normalizeEmail(email);
  return value.length <= 254 && EMAIL_RE.test(value);
}

/**
 * Add an email to a list, de-duplicating case-insensitively.
 * Returns the new list plus whether it was added and the signup's position.
 */
export function addEmail(emails: string[], email: string): JoinResult {
  const normalized = normalizeEmail(email);
  const existingIndex = emails.findIndex((e) => normalizeEmail(e) === normalized);

  if (existingIndex !== -1) {
    return {
      emails,
      added: false,
      position: existingIndex + 1,
      total: emails.length,
    };
  }

  const next = [...emails, normalized];
  return {
    emails: next,
    added: true,
    position: next.length,
    total: next.length,
  };
}

// --- File-backed persistence (server only) -------------------------------

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "waitlist.json");

async function readData(): Promise<WaitlistData> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<WaitlistData>;
    return { emails: Array.isArray(parsed.emails) ? parsed.emails : [] };
  } catch {
    return { emails: [] };
  }
}

async function writeData(data: WaitlistData): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

export async function getCount(): Promise<number> {
  const data = await readData();
  return data.emails.length;
}

export async function joinWaitlist(email: string): Promise<JoinResult> {
  const data = await readData();
  const result = addEmail(data.emails, email);
  if (result.added) {
    await writeData({ emails: result.emails });
  }
  return result;
}
