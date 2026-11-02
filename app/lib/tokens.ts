import { USDC_SAC, XLM_SAC } from "./stellar";

export interface TokenOption {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
}

const options: TokenOption[] = [];

if (XLM_SAC) {
  options.push({
    id: XLM_SAC,
    symbol: "XLM",
    name: "Stellar Lumens",
    decimals: 7,
  });
}

if (USDC_SAC) {
  options.push({
    id: USDC_SAC,
    symbol: "USDC",
    name: "USD Coin",
    decimals: 7,
  });
}

export const TOKEN_OPTIONS = options;

export function tokenSymbol(address: string): string {
  const match = TOKEN_OPTIONS.find(
    (token) => token.id.toUpperCase() === address.trim().toUpperCase(),
  );
  return match?.symbol ?? "TOKEN";
}

export function tokenName(address: string): string {
  const match = TOKEN_OPTIONS.find(
    (token) => token.id.toUpperCase() === address.trim().toUpperCase(),
  );
  return match?.name ?? "Campaign token";
}
