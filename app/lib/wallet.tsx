"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getAddress,
  getNetwork,
  isAllowed,
  isConnected,
  requestAccess,
  signTransaction as freighterSignTransaction,
} from "@stellar/freighter-api";
import { NETWORK, NETWORK_PASSPHRASE } from "./stellar";

interface WalletContextValue {
  address: string | null;
  network: string | null;
  networkPassphrase: string | null;
  isInstalled: boolean | null;
  isConnecting: boolean;
  isWrongNetwork: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  sign: (xdr: string) => Promise<string>;
  clearError: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

const EXPECTED_NETWORK = NETWORK === "public" ? "PUBLIC" : "TESTNET";

function walletErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  if (error instanceof Error) return error.message;
  return "The wallet request failed.";
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [networkPassphrase, setNetworkPassphrase] = useState<string | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshNetwork = useCallback(async () => {
    const result = await getNetwork();
    if (!result.error) {
      setNetwork(result.network);
      setNetworkPassphrase(result.networkPassphrase);
    }
  }, []);

  const restore = useCallback(async () => {
    try {
      const connection = await isConnected();
      if (!connection.isConnected) {
        setIsInstalled(false);
        return;
      }

      setIsInstalled(true);
      await refreshNetwork();

      const allowed = await isAllowed();
      if (!allowed.isAllowed) return;

      const result = await getAddress();
      if (result.address && !result.error) {
        setAddress(result.address);
      }
    } catch {
      setIsInstalled(false);
    }
  }, [refreshNetwork]);

  useEffect(() => {
    void restore();
  }, [restore]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onFocus = () => {
      void restore();
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [restore]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const connection = await isConnected();
      setIsInstalled(connection.isConnected);

      if (!connection.isConnected) {
        throw new Error(
          "Freighter is not available. Install the Freighter browser extension and refresh the page.",
        );
      }

      const access = await requestAccess();
      if (access.error) throw access.error;
      if (!access.address) throw new Error("Freighter did not return an account.");

      setAddress(access.address);
      await refreshNetwork();
    } catch (cause) {
      setError(walletErrorMessage(cause));
    } finally {
      setIsConnecting(false);
    }
  }, [refreshNetwork]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setError(null);
  }, []);

  const sign = useCallback(
    async (xdr: string) => {
      if (!address) throw new Error("Connect your Freighter wallet first.");

      const result = await freighterSignTransaction(xdr, {
        networkPassphrase: NETWORK_PASSPHRASE,
        address,
      });

      if (result.error) throw new Error(result.error.message);
      if (!result.signedTxXdr) throw new Error("Freighter did not return a signed transaction.");

      return result.signedTxXdr;
    },
    [address],
  );

  const value = useMemo<WalletContextValue>(
    () => ({
      address,
      network,
      networkPassphrase,
      isInstalled,
      isConnecting,
      isWrongNetwork: Boolean(network && network !== EXPECTED_NETWORK),
      error,
      connect,
      disconnect,
      sign,
      clearError: () => setError(null),
    }),
    [
      address,
      network,
      networkPassphrase,
      isInstalled,
      isConnecting,
      error,
      connect,
      disconnect,
      sign,
    ],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used inside WalletProvider");
  return context;
}
