import { AppError } from "../../lib/errors";
import * as connection from "./service";
import { describeGoogleFailure } from "./googleErrors";

export const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export interface GoogleEventTime {
  date?: string;
  dateTime?: string;
  timeZone?: string;
}

export interface GoogleEvent {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: GoogleEventTime;
  end?: GoogleEventTime;
  recurrence?: string[];
  recurringEventId?: string;
  updated?: string;
}

export interface GoogleEventListPage {
  items: GoogleEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
}

export async function googleFetch<T>(userId: string, path: string, init?: RequestInit): Promise<T> {
  const accessToken = await connection.getValidAccessToken(userId);
  const response = await fetch(`${CALENDAR_API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...init?.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    // El detalle técnico queda en el registro del servidor; al usuario se le explica la causa.
    console.error(`Google Calendar API respondió ${response.status}: ${JSON.stringify(body)}`);
    throw new AppError("EXTERNAL_SERVICE_ERROR", describeGoogleFailure(response.status, body));
  }
  return body as T;
}
