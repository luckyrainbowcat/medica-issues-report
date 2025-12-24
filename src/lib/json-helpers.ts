// Helper functions for JSON serialization/deserialization with SQLite
// SQLite stores arrays and objects as JSON strings

export function serializeArray(arr: string[]): string {
  return JSON.stringify(arr);
}

export function deserializeArray(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function serializeJson(obj: any): string | null {
  if (obj === null || obj === undefined) return null;
  return JSON.stringify(obj);
}

export function deserializeJson(json: string | null | undefined): any {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

