"use client";

import { useCallback, useEffect, useState } from "react";
import { getTokenBalance } from "../carebridge";
import { READ_ACCOUNT } from "../stellar";

export function useTokenBalance(token: string | null, account: string | null) {
  const [balance, setBalance] = useState<bigint>(0n);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token || !account) {
      setBalance(0n);
      return;
    }

    setLoading(true);
    try {
      const value = await getTokenBalance(token, account, READ_ACCOUNT || account);
      setBalance(value);
    } catch {
      setBalance(0n);
    } finally {
      setLoading(false);
    }
  }, [account, token]);

  useEffect(() => {
    void load();
  }, [load]);

  return { balance, loading, refresh: load };
}
