import { Networks } from "@stellar/stellar-sdk/base";
import { Server } from "@stellar/stellar-sdk/rpc";

const network = (process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "testnet").toLowerCase();

export const NETWORK = network === "public" || network === "mainnet" ? "public" : "testnet";
export const IS_MAINNET = NETWORK === "public";
export const RPC_URL =
  process.env.NEXT_PUBLIC_STELLAR_RPC_URL ??
  (IS_MAINNET ? "https://soroban-mainnet.stellar.org" : "https://soroban-testnet.stellar.org");
export const NETWORK_PASSPHRASE = IS_MAINNET ? Networks.PUBLIC : Networks.TESTNET;
export const HORIZON_URL =
  process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL ??
  (IS_MAINNET ? "https://horizon.stellar.org" : "https://horizon-testnet.stellar.org");

export const CONTRACT_ID = (process.env.NEXT_PUBLIC_CONTRACT_ID ?? "").trim();
export const READ_ACCOUNT = (process.env.NEXT_PUBLIC_READ_ACCOUNT ?? "").trim();
export const XLM_SAC = (process.env.NEXT_PUBLIC_XLM_SAC ?? "").trim();
export const USDC_SAC = (process.env.NEXT_PUBLIC_USDC_SAC ?? "").trim();
export const DEFAULT_TOKEN = (process.env.NEXT_PUBLIC_DEFAULT_TOKEN ?? XLM_SAC).trim();

export const EXPLORER_BASE = IS_MAINNET
  ? "https://stellar.expert/explorer/public"
  : "https://stellar.expert/explorer/testnet";

export const isContractConfigured = CONTRACT_ID.length > 0;

let server: Server | null = null;

export function getServer(): Server {
  if (!server) {
    server = new Server(RPC_URL, {
      allowHttp: RPC_URL.startsWith("http://"),
      timeout: 30_000,
    });
  }
  return server;
}

export function explorerTxUrl(hash: string): string {
  return `${EXPLORER_BASE}/tx/${hash}`;
}

export function explorerAccountUrl(address: string): string {
  return `${EXPLORER_BASE}/account/${address}`;
}

export function explorerContractUrl(contractId = CONTRACT_ID): string {
  return `${EXPLORER_BASE}/contract/${contractId}`;
}
