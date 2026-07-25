"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getToken, setToken } from "../lib/api";

const AuthContext = createContext(null);

const SUB_ACCOUNT_KEY = "fai_sub_account_id";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [subAccounts, setSubAccounts] = useState([]);
  const [subAccountId, setSubAccountId] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setSubAccounts([]);
      setLoading(false);
      return;
    }
    try {
      const data = await api("/api/auth/me");
      setUser(data.user);
      setSubAccounts(data.subAccounts);
      const stored = typeof window !== "undefined" ? window.localStorage.getItem(SUB_ACCOUNT_KEY) : null;
      const validStored = data.subAccounts.find((s) => s.id === stored);
      setSubAccountId(validStored ? stored : data.subAccounts[0]?.id || null);
    } catch {
      setToken(null);
      setUser(null);
      setSubAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(
    async (email, password) => {
      const data = await api("/api/auth/login", { method: "POST", body: { email, password }, auth: false });
      setToken(data.token);
      await refresh();
      router.push("/dashboard/contacts");
    },
    [refresh, router]
  );

  const signup = useCallback(
    async (agencyName, name, email, password) => {
      const data = await api("/api/auth/signup", {
        method: "POST",
        body: { agencyName, name, email, password },
        auth: false,
      });
      setToken(data.token);
      await refresh();
      router.push("/dashboard/contacts");
    },
    [refresh, router]
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setSubAccounts([]);
    setSubAccountId(null);
    router.push("/login");
  }, [router]);

  const switchSubAccount = useCallback((id) => {
    setSubAccountId(id);
    if (typeof window !== "undefined") window.localStorage.setItem(SUB_ACCOUNT_KEY, id);
  }, []);

  const currentSubAccount = useMemo(
    () => subAccounts.find((s) => s.id === subAccountId) || null,
    [subAccounts, subAccountId]
  );

  const value = useMemo(
    () => ({
      user,
      subAccounts,
      subAccountId,
      currentSubAccount,
      loading,
      login,
      signup,
      logout,
      switchSubAccount,
      refresh,
    }),
    [user, subAccounts, subAccountId, currentSubAccount, loading, login, signup, logout, switchSubAccount, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
