"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** fetch() for the admin API: JSON in and out, errors thrown with the server's message, and a lapsed session sends you to sign in */
export function useAdminApi() {
  const router = useRouter();
  return useCallback(
    async <T = Record<string, unknown>>(path: string, init?: RequestInit): Promise<T> => {
      const res = await fetch(path, { ...init, headers: { "content-type": "application/json", ...init?.headers } });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace("/login?next=/admin");
        throw new Error("Your session expired. Please sign in again.");
      }
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      return data as T;
    },
    [router]
  );
}

/** Loads one admin endpoint, with reload and local edits so screens can update rows without refetching */
export function useAdminData<T>(path: string) {
  const api = useAdminApi();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await api<T>(path));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load");
    }
    setLoading(false);
  }, [api, path]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  return { data, setData, error, loading, reload, api };
}
