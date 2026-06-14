"use client";

const USER_ID_KEY = "ai-world-cup-user-id";

export function getGuestId(): string {
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}
