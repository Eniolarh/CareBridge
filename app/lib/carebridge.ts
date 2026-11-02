import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk/base";
import { Api, assembleTransaction } from "@stellar/stellar-sdk/rpc";
import {
  CONTRACT_ID,
  NETWORK_PASSPHRASE,
  READ_ACCOUNT,
  getServer,
  isContractConfigured,
} from "./stellar";
import type {
  Campaign,
  CampaignStatus,
  CreateCampaignInput,
  Invoice,
  SignTransaction,
  TransactionResult,
} from "./types";

export class CareBridgeError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
  ) {
    super(message);
    this.name = "CareBridgeError";
  }
}

const CONTRACT_ERRORS: Record<number, string> = {
  1: "Campaign not found.",
  2: "Amount must be greater than zero.",
  3: "The funding target must be greater than zero.",
  4: "This campaign is no longer accepting donations.",
  5: "This campaign is not refundable.",
  6: "That invoice has already been verified.",
  7: "No verified invoice exists with that ID.",
  8: "The release amount exceeds the verified invoice amount.",
  9: "Funds can only be released to the patient or the medical provider.",
  10: "The campaign escrow does not hold enough funds for this release.",
  11: "There is nothing left to refund for this donor.",
  12: "Amount overflow.",
};

function ensureConfigured(): void {
  if (!isContractConfigured) {
    throw new CareBridgeError(
      "The CareBridge contract is not configured. Run the deployment script or set NEXT_PUBLIC_CONTRACT_ID in app/.env.local.",
    );
  }
}

function contract(): Contract {
  return new Contract(CONTRACT_ID);
}

function contractErrorCode(message: string): number | undefined {
  const match = message.match(/Error\(Contract,\s*#(\d+)\)/);
  if (!match) return undefined;
  return Number(match[1]);
}

export function humanizeError(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Something went wrong.";

  const code = contractErrorCode(message);
  if (code && CONTRACT_ERRORS[code]) return CONTRACT_ERRORS[code];

  if (/account not found/i.test(message)) {
    return "The read account does not exist on this network. Fund it with Friendbot or update NEXT_PUBLIC_READ_ACCOUNT.";
  }
  if (/insufficient balance|balance is not sufficient|underfunded/i.test(message)) {
    return "Insufficient token balance. Fund your wallet with the campaign token and try again.";
  }
  if (/trustline|not trusted/i.test(message)) {
    return "Your wallet does not have a trustline for this token. Add the token in Freighter first.";
  }
  if (/user rejected|declined|denied/i.test(message)) {
    return "The wallet signature was declined.";
  }
  if (/not configured/i.test(message)) return message;

  return message;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return String(value);
}

function asBigInt(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.trunc(value));
  if (typeof value === "string" && value.trim() !== "") {
    try {
      return BigInt(value);
    } catch {
      return 0n;
    }
  }
  return 0n;
}

function asStatus(value: unknown): CampaignStatus {
  let candidate = value;

  if (Array.isArray(candidate)) candidate = candidate[0];
  if (candidate && typeof candidate === "object" && "tag" in candidate) {
    candidate = (candidate as { tag: unknown }).tag;
  }
  if (candidate && typeof candidate === "object" && "name" in candidate) {
    candidate = (candidate as { name: unknown }).name;
  }

  if (typeof candidate === "string") {
    const normalized = candidate.toLowerCase();
    if (normalized === "completed") return "Completed";
    if (normalized === "refunded") return "Refunded";
    return "Active";
  }

  if (typeof candidate === "number") {
    return (["Active", "Completed", "Refunded"] as const)[candidate] ?? "Active";
  }

  return "Active";
}

export function normalizeCampaign(value: unknown): Campaign {
  const raw = asRecord(value);
  return {
    id: asBigInt(raw.id),
    patientId: asString(raw.patient_id),
    title: asString(raw.title),
    description: asString(raw.description),
    patient: asString(raw.patient),
    provider: asString(raw.provider),
    verifier: asString(raw.verifier),
    token: asString(raw.token),
    targetAmount: asBigInt(raw.target_amount),
    raisedAmount: asBigInt(raw.raised_amount),
    releasedAmount: asBigInt(raw.released_amount),
    refundedAmount: asBigInt(raw.refunded_amount),
    createdAt: asBigInt(raw.created_at),
    status: asStatus(raw.status),
  };
}

export function normalizeInvoice(value: unknown): Invoice {
  const raw = asRecord(value);
  return {
    invoiceId: asString(raw.invoice_id),
    amount: asBigInt(raw.amount),
    releasedAmount: asBigInt(raw.released_amount),
  };
}

function scvAddress(address: string): xdr.ScVal {
  return new Address(address).toScVal();
}

function scvU64(value: bigint | number): xdr.ScVal {
  return nativeToScVal(BigInt(value), { type: "u64" });
}

function scvU32(value: number): xdr.ScVal {
  return nativeToScVal(value, { type: "u32" });
}

function scvI128(value: bigint): xdr.ScVal {
  return nativeToScVal(value, { type: "i128" });
}

function scvString(value: string): xdr.ScVal {
  return nativeToScVal(value, { type: "string" });
}

async function readContract<T>(
  method: string,
  args: xdr.ScVal[],
  source?: string,
): Promise<T> {
  ensureConfigured();

  const readSource = source || READ_ACCOUNT;
  if (!readSource) {
    throw new CareBridgeError(
      "No read account configured. Set NEXT_PUBLIC_READ_ACCOUNT to a funded testnet account, or connect a wallet.",
    );
  }

  const server = getServer();
  const tx = new TransactionBuilder(new Account(readSource, "0"), {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract().call(method, ...args))
    .setTimeout(30)
    .build();

  const simulation = await server.simulateTransaction(tx);

  if (Api.isSimulationError(simulation)) {
    throw new CareBridgeError(humanizeError(simulation.error));
  }
  if (!simulation.result) {
    throw new CareBridgeError(`The contract call ${method} returned no value.`);
  }

  return scValToNative(simulation.result.retval) as T;
}

async function invokeContract<T = unknown>(
  source: string,
  method: string,
  args: xdr.ScVal[],
  sign: SignTransaction,
): Promise<TransactionResult<T>> {
  ensureConfigured();

  const server = getServer();
  const account = await server.getAccount(source);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract().call(method, ...args))
    .setTimeout(120)
    .build();

  const simulation = await server.simulateTransaction(tx);

  if (Api.isSimulationError(simulation)) {
    throw new CareBridgeError(humanizeError(simulation.error));
  }
  if (Api.isSimulationRestore(simulation)) {
    throw new CareBridgeError(
      "The contract storage has expired and needs restoration before this action can continue.",
    );
  }

  const prepared = assembleTransaction(tx, simulation).build();
  const signedXdr = await sign(prepared.toXDR());
  const signed = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

  const sent = await server.sendTransaction(signed);

  if (sent.status === "ERROR") {
    throw new CareBridgeError(
      "The network rejected the transaction. Check the wallet balance and try again.",
    );
  }
  if (sent.status === "TRY_AGAIN_LATER") {
    throw new CareBridgeError("The network is busy. Please try again in a moment.");
  }

  const result = await server.pollTransaction(sent.hash, { attempts: 45 });

  if (result.status !== Api.GetTransactionStatus.SUCCESS) {
    throw new CareBridgeError(
      result.status === Api.GetTransactionStatus.FAILED
        ? "The transaction failed on-chain. Please review the campaign state and try again."
        : "The transaction was submitted but has not confirmed yet. Check the explorer shortly.",
    );
  }

  return {
    hash: sent.hash,
    value: (result.returnValue ? scValToNative(result.returnValue) : null) as T,
  };
}

export async function getCampaignCount(source?: string): Promise<bigint> {
  const value = await readContract<unknown>("get_campaign_count", [], source);
  return asBigInt(value);
}

export async function getCampaign(id: bigint, source?: string): Promise<Campaign> {
  const value = await readContract<unknown>("get_campaign", [scvU64(id)], source);
  return normalizeCampaign(value);
}

export async function getCampaigns(options?: {
  limit?: number;
  source?: string;
  readSource?: string;
}): Promise<Campaign[]> {
  const limit = options?.limit ?? 200;
  const source = options?.source ?? options?.readSource;
  const count = await getCampaignCount(source);

  if (count === 0n) return [];

  const pageSize = 50n;
  const campaigns: Campaign[] = [];

  for (let start = 1n; start <= count; start += pageSize) {
    const page = await readContract<unknown[]>(
      "get_campaigns",
      [scvU64(start), scvU32(Number(pageSize))],
      source,
    );

    if (Array.isArray(page)) {
      campaigns.push(...page.map(normalizeCampaign));
    }

    if (campaigns.length >= limit) break;
  }

  return campaigns
    .sort((a, b) => (a.id === b.id ? 0 : a.id > b.id ? -1 : 1))
    .slice(0, limit);
}

export async function getContribution(
  campaignId: bigint,
  donor: string,
  source?: string,
): Promise<bigint> {
  const value = await readContract<unknown>(
    "get_contribution",
    [scvU64(campaignId), scvAddress(donor)],
    source,
  );
  return asBigInt(value);
}

export async function getInvoice(
  campaignId: bigint,
  invoiceId: string,
  source?: string,
): Promise<Invoice | null> {
  const value = await readContract<unknown>(
    "get_invoice",
    [scvU64(campaignId), scvString(invoiceId)],
    source,
  );

  if (!value) return null;
  const invoice = normalizeInvoice(value);
  if (!invoice.invoiceId) return null;
  return invoice;
}

export async function getTokenBalance(
  token: string,
  account: string,
  source?: string,
): Promise<bigint> {
  ensureConfigured();
  const server = getServer();
  const readSource = source || READ_ACCOUNT || account;
  const tokenContract = new Contract(token);

  const tx = new TransactionBuilder(new Account(readSource, "0"), {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(tokenContract.call("balance", scvAddress(account)))
    .setTimeout(30)
    .build();

  const simulation = await server.simulateTransaction(tx);
  if (Api.isSimulationError(simulation) || !simulation.result) {
    return 0n;
  }

  return asBigInt(scValToNative(simulation.result.retval));
}

export async function initializeCampaign(
  input: CreateCampaignInput,
  sign: SignTransaction,
): Promise<TransactionResult<bigint>> {
  return invokeContract<bigint>(
    input.patient,
    "initialize_campaign",
    [
      scvAddress(input.patient),
      scvAddress(input.provider),
      scvAddress(input.verifier),
      scvAddress(input.token),
      scvString(input.patientId),
      scvString(input.title),
      scvString(input.description),
      scvI128(input.targetAmount),
    ],
    sign,
  );
}

export async function donate(
  campaignId: bigint,
  donor: string,
  amount: bigint,
  sign: SignTransaction,
): Promise<TransactionResult<bigint>> {
  return invokeContract<bigint>(
    donor,
    "donate",
    [scvU64(campaignId), scvAddress(donor), scvI128(amount)],
    sign,
  );
}

export async function verifyInvoice(
  campaignId: bigint,
  verifier: string,
  invoiceId: string,
  amount: bigint,
  sign: SignTransaction,
): Promise<TransactionResult<null>> {
  return invokeContract<null>(
    verifier,
    "verify_invoice",
    [scvU64(campaignId), scvString(invoiceId), scvI128(amount)],
    sign,
  );
}

export async function releaseFunds(
  campaignId: bigint,
  verifier: string,
  invoiceId: string,
  amount: bigint,
  recipient: string,
  sign: SignTransaction,
): Promise<TransactionResult<bigint>> {
  return invokeContract<bigint>(
    verifier,
    "release_funds",
    [
      scvU64(campaignId),
      scvString(invoiceId),
      scvI128(amount),
      scvAddress(recipient),
    ],
    sign,
  );
}

export async function refundCampaign(
  campaignId: bigint,
  verifier: string,
  sign: SignTransaction,
): Promise<TransactionResult<null>> {
  return invokeContract<null>(verifier, "refund_campaign", [scvU64(campaignId)], sign);
}

export async function claimRefund(
  campaignId: bigint,
  donor: string,
  sign: SignTransaction,
): Promise<TransactionResult<bigint>> {
  return invokeContract<bigint>(
    donor,
    "claim_refund",
    [scvU64(campaignId), scvAddress(donor)],
    sign,
  );
}
