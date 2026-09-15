"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, RoleEnum } from "../lib/types";
import { getToken, setToken, removeToken, loginApi, registerApi, getMeApi } from "../lib/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: Record<string, any>) => Promise<User>;
  register: (payload: Record<string, any>) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async (): Promise<User | null> => {
    const currentToken = getToken();
    if (!currentToken) {
      setUser(null);
      setTokenState(null);
      setIsLoading(false);
      return null;
    }

    try {
      setTokenState(currentToken);
      const userData = await getMeApi();
      setUser(userData);
      return userData;
    } catch (err) {
      console.error("Failed to re-authenticate session:", err);
      removeToken();
      setTokenState(null);
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (credentials: Record<string, any>): Promise<User> => {
    const authRes = await loginApi(credentials);
    setToken(authRes.access_token);
    setTokenState(authRes.access_token);
    const userData = await getMeApi();
    setUser(userData);
    return userData;
  };

  const register = async (payload: Record<string, any>): Promise<User> => {
    const registeredUser = await registerApi(payload);
    // Automatically log in after registration
    await login({ email: payload.email, password: payload.password });
    return registeredUser;
  };

  const logout = () => {
    removeToken();
    setTokenState(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
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
