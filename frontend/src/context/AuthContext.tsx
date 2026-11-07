"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  User,
  UserConsent,
  LoginPayload,
  RegisterPayload,
  UserUpdatePayload,
  ConsentUpdatePayload,
  loginCustomer,
  registerCustomer,
  logoutCustomer,
  fetchMyProfile,
  updateMyProfile,
  fetchMyConsents,
  updateMyConsents,
  refreshCustomerSession,
  ApiError,
} from "@/lib/api";

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  error: string | null;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
  updateProfile: (payload: UserUpdatePayload) => Promise<User>;
  getConsents: () => Promise<UserConsent>;
  updateConsents: (payload: ConsentUpdatePayload) => Promise<UserConsent>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const initAuth = useCallback(async () => {
    try {
      const storedToken =
        typeof window !== "undefined"
          ? localStorage.getItem("drape_access_token")
          : null;

      if (storedToken) {
        try {
          const profile = await fetchMyProfile(storedToken);
          setUser(profile);
          setAccessToken(storedToken);
          setLoading(false);
          return;
        } catch {
          // Token expired or invalid, fall through to refresh
        }
      }

      // Try cookie-based refresh
      try {
        const refreshed = await refreshCustomerSession();
        setUser(refreshed.user);
        setAccessToken(refreshed.access_token);
        if (typeof window !== "undefined") {
          localStorage.setItem("drape_access_token", refreshed.access_token);
        }
      } catch {
        // Not logged in or session expired
        setUser(null);
        setAccessToken(null);
        if (typeof window !== "undefined") {
          localStorage.removeItem("drape_access_token");
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const login = async (payload: LoginPayload): Promise<User> => {
    setError(null);
    try {
      const res = await loginCustomer(payload);
      setUser(res.user);
      setAccessToken(res.access_token);
      if (typeof window !== "undefined") {
        localStorage.setItem("drape_access_token", res.access_token);
      }
      return res.user;
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.problem.detail : "Login failed";
      setError(msg);
      throw err;
    }
  };

  const register = async (payload: RegisterPayload): Promise<User> => {
    setError(null);
    try {
      const res = await registerCustomer(payload);
      setUser(res.user);
      setAccessToken(res.access_token);
      if (typeof window !== "undefined") {
        localStorage.setItem("drape_access_token", res.access_token);
      }
      return res.user;
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.problem.detail
          : "Account creation failed";
      setError(msg);
      throw err;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await logoutCustomer(accessToken);
    } catch {
      // Continue client cleanup even if network fails
    } finally {
      setUser(null);
      setAccessToken(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("drape_access_token");
      }
    }
  };

  const withTokenRefresh = async <T,>(
    operation: (token: string | null) => Promise<T>
  ): Promise<T> => {
    try {
      return await operation(accessToken);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.problem.status === 401) {
        // Access token might be expired. Attempt transparent refresh
        try {
          const refreshed = await refreshCustomerSession();
          setUser(refreshed.user);
          setAccessToken(refreshed.access_token);
          if (typeof window !== "undefined") {
            localStorage.setItem("drape_access_token", refreshed.access_token);
          }
          return await operation(refreshed.access_token);
        } catch {
          // Refresh also failed - session is fully invalid or revoked
          await logout();
          throw err;
        }
      }
      throw err;
    }
  };

  const updateProfile = async (
    payload: UserUpdatePayload
  ): Promise<User> => {
    setError(null);
    try {
      const updated = await withTokenRefresh((token) =>
        updateMyProfile(payload, token)
      );
      setUser(updated);
      return updated;
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError ? err.problem.detail : "Failed to update profile";
      setError(msg);
      throw err;
    }
  };

  const getConsents = async (): Promise<UserConsent> => {
    return await withTokenRefresh((token) => fetchMyConsents(token));
  };

  const updateConsents = async (
    payload: ConsentUpdatePayload
  ): Promise<UserConsent> => {
    setError(null);
    try {
      return await withTokenRefresh((token) =>
        updateMyConsents(payload, token)
      );
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError ? err.problem.detail : "Failed to update consents";
      setError(msg);
      throw err;
    }
  };

  const refreshUser = async (): Promise<void> => {
    if (!accessToken) return;
    try {
      const profile = await fetchMyProfile(accessToken);
      setUser(profile);
    } catch {
      // Ignore background refresh failure
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        loading,
        error,
        login,
        register,
        logout,
        updateProfile,
        getConsents,
        updateConsents,
        refreshUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

