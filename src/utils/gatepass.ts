import { randomBytes } from "crypto";
export function generateQrToken(): string {
  return randomBytes(32).toString("hex"); // 64 char, sulit ditebak
}
