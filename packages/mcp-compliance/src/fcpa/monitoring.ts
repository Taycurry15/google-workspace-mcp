/**
 * FCPA Monitoring Module
 * Foreign Corrupt Practices Act compliance monitoring
 */

import type { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import { appendRows, generateNextId, readSheetRange } from "@gw-mcp/shared-core";

const SPREADSHEET_ID = process.env.COMPLIANCE_SPREADSHEET_ID || "";

export interface FCPATransaction {
  transactionId: string;
  programId: string;
  vendorId: string;
  vendorName: string;
  transactionType: "payment" | "gift" | "entertainment" | "travel" | "other";
  amount: number;
  currency: string;
  date: Date;
  purpose: string;
  recipient: string;
  recipientTitle?: string;
  country: string;
  riskLevel: "low" | "medium" | "high";
  approver: string;
  status: "pending_review" | "approved" | "flagged" | "rejected";
  notes?: string;
}

/**
 * Log an FCPA transaction for monitoring
 */
export async function logFCPATransaction(
  auth: OAuth2Client,
  params: {
    programId: string;
    vendorId: string;
    vendorName: string;
    transactionType: FCPATransaction["transactionType"];
    amount: number;
    currency: string;
    date: Date;
    purpose: string;
    recipient: string;
    recipientTitle?: string;
    country: string;
    approver: string;
  }
): Promise<FCPATransaction> {
  const sheets = google.sheets({ version: "v4", auth });

  const transactionId = await generateNextId(
    sheets,
    SPREADSHEET_ID,
    "FCPA Transactions",
    "Transaction ID",
    "FCPA"
  );

  // Calculate risk level based on amount, country, recipient
  const riskLevel = calculateFCPARisk(params.amount, params.country);

  const transaction: FCPATransaction = {
    transactionId,
    programId: params.programId,
    vendorId: params.vendorId,
    vendorName: params.vendorName,
    transactionType: params.transactionType,
    amount: params.amount,
    currency: params.currency,
    date: params.date,
    purpose: params.purpose,
    recipient: params.recipient,
    recipientTitle: params.recipientTitle,
    country: params.country,
    riskLevel,
    approver: params.approver,
    status: riskLevel === "high" ? "pending_review" : "approved",
  };

  await appendRows(sheets, SPREADSHEET_ID, "FCPA Transactions!A:A", [
    [
      transaction.transactionId,
      transaction.programId,
      transaction.vendorId,
      transaction.vendorName,
      transaction.transactionType,
      transaction.amount,
      transaction.currency,
      transaction.date.toISOString().split("T")[0],
      transaction.purpose,
      transaction.recipient,
      transaction.recipientTitle || "",
      transaction.country,
      transaction.riskLevel,
      transaction.approver,
      transaction.status,
      transaction.notes || "",
    ],
  ]);

  return transaction;
}

/**
 * Calculate FCPA risk level
 */
function calculateFCPARisk(amount: number, country: string): "low" | "medium" | "high" {
  // High-risk countries (simplified - would use CPI index in production)
  const highRiskCountries = ["AF", "IQ", "SO", "SS", "SY", "YE"];
  
  if (amount > 10000 || highRiskCountries.includes(country)) {
    return "high";
  } else if (amount > 5000) {
    return "medium";
  }
  return "low";
}

/**
 * Get FCPA transactions for review
 */
export async function getFCPATransactionsForReview(
  auth: OAuth2Client,
  programId?: string
): Promise<FCPATransaction[]> {
  const sheets = google.sheets({ version: "v4", auth });
  const data = await readSheetRange(sheets, SPREADSHEET_ID, "FCPA Transactions!A:P");

  if (data.length <= 1) {
    return [];
  }

  const transactions: FCPATransaction[] = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (programId && row[1] !== programId) continue;
    if (row[14] !== "pending_review" && row[14] !== "flagged") continue;

    transactions.push({
      transactionId: row[0],
      programId: row[1],
      vendorId: row[2],
      vendorName: row[3],
      transactionType: row[4] as any,
      amount: parseFloat(row[5]),
      currency: row[6],
      date: new Date(row[7]),
      purpose: row[8],
      recipient: row[9],
      recipientTitle: row[10] || undefined,
      country: row[11],
      riskLevel: row[12] as any,
      approver: row[13],
      status: row[14] as any,
      notes: row[15] || undefined,
    });
  }

  return transactions;
}
