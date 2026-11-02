"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getCampaign, humanizeError } from "../carebridge";
import { READ_ACCOUNT, isContractConfigured } from "../stellar";
import type { Campaign } from "../types";
import { useWallet } from "../wallet";

export function useCampaign(id: bigint | null, refreshMs = 10_000) {
  const { address } = useWallet();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    if (id === null) {
      setLoading(false);
      return;
    }
    if (!isContractConfigured) {
      setLoading(false);
      setError(
        "The contract is not configured. Run the deployment script to populate app/.env.local.",
      );
      return;
    }

    try {
      const result = await getCampaign(id, READ_ACCOUNT || address || undefined);
      if (!mounted.current) return;
      setCampaign(result);
      setError(null);
    } catch (cause) {
      if (!mounted.current) return;
      setError(humanizeError(cause));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [address, id]);

  useEffect(() => {
    mounted.current = true;
    void load();

    const timer = window.setInterval(() => {
      void load();
    }, refreshMs);

    return () => {
      mounted.current = false;
      window.clearInterval(timer);
    };
  }, [load, refreshMs]);

  return { campaign, loading, error, refresh: load };
}
