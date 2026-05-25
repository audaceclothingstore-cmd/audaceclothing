import { createHash } from "crypto";

export const PAYU_BASE_URL = "https://secure.payu.in/_payment";

const EMPTY_PAYU_UDF_TAIL = ["", "", "", "", ""] as const;

function sha512(value: string): string {
  return createHash("sha512").update(value, "utf8").digest("hex");
}

export function cleanPayUValue(value: string | undefined | null): string {
  return String(value ?? "").trim();
}

export function formatPayUAmount(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid PayU amount");
  }
  return amount.toFixed(2);
}

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

export type PayUFormFields = PayURequestFields & {
  hash: string;
};

export function buildPayUFormFields(fields: PayURequestFields, salt: string): PayUFormFields {
  const cleaned: PayURequestFields = {
    key: cleanPayUValue(fields.key),
    txnid: cleanPayUValue(fields.txnid),
    amount: cleanPayUValue(fields.amount),
    productinfo: cleanPayUValue(fields.productinfo),
    firstname: cleanPayUValue(fields.firstname),
    email: cleanPayUValue(fields.email),
    phone: cleanPayUValue(fields.phone),
    surl: cleanPayUValue(fields.surl),
    furl: cleanPayUValue(fields.furl),
    udf1: cleanPayUValue(fields.udf1),
    udf2: cleanPayUValue(fields.udf2),
    udf3: cleanPayUValue(fields.udf3),
    udf4: cleanPayUValue(fields.udf4),
    udf5: cleanPayUValue(fields.udf5),
  };

  return {
    ...cleaned,
    hash: generatePayURequestHash(cleaned, salt),
  };
}

export function generatePayURequestHash(fields: PayURequestFields, salt: string): string {
  const hashString = [
    cleanPayUValue(fields.key),
    cleanPayUValue(fields.txnid),
    cleanPayUValue(fields.amount),
    cleanPayUValue(fields.productinfo),
    cleanPayUValue(fields.firstname),
    cleanPayUValue(fields.email),
    cleanPayUValue(fields.udf1),
    cleanPayUValue(fields.udf2),
    cleanPayUValue(fields.udf3),
    cleanPayUValue(fields.udf4),
    cleanPayUValue(fields.udf5),
    ...EMPTY_PAYU_UDF_TAIL,
    cleanPayUValue(salt),
  ].join("|");

  return sha512(hashString);
}

export function verifyPayUResponseHash(params: Record<string, string>, salt: string): boolean {
  const additionalCharges = cleanPayUValue(params.additionalCharges);
  const base = [
    cleanPayUValue(salt),
    cleanPayUValue(params.status),
    ...EMPTY_PAYU_UDF_TAIL,
    cleanPayUValue(params.udf5),
    cleanPayUValue(params.udf4),
    cleanPayUValue(params.udf3),
    cleanPayUValue(params.udf2),
    cleanPayUValue(params.udf1),
    cleanPayUValue(params.email),
    cleanPayUValue(params.firstname),
    cleanPayUValue(params.productinfo),
    cleanPayUValue(params.amount),
    cleanPayUValue(params.txnid),
    cleanPayUValue(params.key),
  ].join("|");
  const str = additionalCharges ? `${additionalCharges}|${base}` : base;
  const computed = sha512(str);
  return computed.toLowerCase() === cleanPayUValue(params.hash).toLowerCase();
}

export function generateTxnId(): string {
  return `AUD${Date.now()}${Math.floor(Math.random() * 10000)}`;
}
