import crypto from "crypto";

export const key = crypto.randomBytes(32);
export const iv = crypto.randomBytes(16);
