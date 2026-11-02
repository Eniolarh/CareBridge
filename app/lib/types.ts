export type CampaignStatus = "Active" | "Completed" | "Refunded";

export interface Campaign {
  id: bigint;
  patientId: string;
  title: string;
  description: string;
  patient: string;
  provider: string;
  verifier: string;
  token: string;
  targetAmount: bigint;
  raisedAmount: bigint;
  releasedAmount: bigint;
  refundedAmount: bigint;
  createdAt: bigint;
  status: CampaignStatus;
}

export interface Invoice {
  invoiceId: string;
  amount: bigint;
  releasedAmount: bigint;
}

export interface CreateCampaignInput {
  patient: string;
  provider: string;
  verifier: string;
  token: string;
  patientId: string;
  title: string;
  description: string;
  targetAmount: bigint;
}

export interface TransactionResult<T = unknown> {
  hash: string;
  value: T;
}

export type SignTransaction = (xdr: string) => Promise<string>;
