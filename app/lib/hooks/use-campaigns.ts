"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getCampaigns, humanizeError } from "../carebridge";
import { READ_ACCOUNT, isContractConfigured } from "../stellar";
import type { Campaign } from "../types";
import { useWallet } from "../wallet";

export function useCampaigns(refreshMs = 15_000) {
  const { address } = useWallet();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    if (!isContractConfigured) {
      setLoading(false);
      setError(
        "The contract is not configured. Run the deployment script to populate app/.env.local.",
      );
      return;
    }

    const source = READ_ACCOUNT || address || undefined;

    try {
      const result = await getCampaigns({ source, limit: 200 });
      if (!mounted.current) return;
      setCampaigns(result);
      setError(null);
    } catch (cause) {
      if (!mounted.current) return;
      setError(humanizeError(cause));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [address]);

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

  return { campaigns, loading, error, refresh: load };
}
