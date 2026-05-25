// PayU India config + hash helpers (server-only)
import { createHash } from "crypto";

export const PAYU_BASE_URL =
  process.env.PAYU_MODE === "live"
    ? "https://secure.payu.in/_payment"
    : "https://test.payu.in/_payment";

export interface PayURequestFields {
  key: string;
  txnid: string;
  amount: string; // 2-decimal string
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  surl: string;
  furl: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
}

// Request hash: sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT)
export function generatePayURequestHash(fields: PayURequestFields, salt: string): string {
  const str = [
    fields.key,
    fields.txnid,
    fields.amount,
    fields.productinfo,
    fields.firstname,
    fields.email,
    fields.udf1 ?? "",
    fields.udf2 ?? "",
    fields.udf3 ?? "",
    fields.udf4 ?? "",
    fields.udf5 ?? "",
    "", "", "", "", "", "",
    salt,
  ].join("|");
  return createHash("sha512").update(str).digest("hex");
}

// Response hash: sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
// (when additionalCharges present, prepend it with a pipe — handled below)
export function verifyPayUResponseHash(params: Record<string, string>, salt: string): boolean {
  const additionalCharges = params.additionalCharges || "";
  const base = [
    salt,
    params.status || "",
    "", "", "", "", "", "",
    params.udf5 || "",
    params.udf4 || "",
    params.udf3 || "",
    params.udf2 || "",
    params.udf1 || "",
    params.email || "",
    params.firstname || "",
    params.productinfo || "",
    params.amount || "",
    params.txnid || "",
    params.key || "",
  ].join("|");
  const str = additionalCharges ? `${additionalCharges}|${base}` : base;
  const computed = createHash("sha512").update(str).digest("hex");
  return computed.toLowerCase() === (params.hash || "").toLowerCase();
}

export function generateTxnId(): string {
  return `AUD${Date.now()}${Math.floor(Math.random() * 10000)}`;
}
