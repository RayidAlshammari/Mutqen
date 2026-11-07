import { randomBytes } from "crypto";

export function newId(prefix = "") {
  return prefix + randomBytes(9).toString("base64url");
}
