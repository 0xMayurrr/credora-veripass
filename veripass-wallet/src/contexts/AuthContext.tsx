import React, { createContext, useContext, useState, useCallback } from "react";
import { ethers } from "ethers";
import { api } from "@/lib/api";
import { CONTRACT_ADDRESSES } from "@/config/contracts";

// ABI — minimal, only getRole needed here
const ROLE_MANAGER_ABI = [
  "function getRole(address user) external view returns (uint8)",
];

export type UserRole = "user" | "issuer" | "ISSUER_OFFICER" | "APPROVER" | "ADMIN" | "CITIZEN";

const ROLE_MAP: Record<number, UserRole> = {
  0: "CITIZEN",
  1: "ISSUER_OFFICER",
  2: "APPROVER",
  3: "ADMIN",
};

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  did: string;
  walletAddress?: string;
  avatar?: string;
  loginMethod: "wallet" | "email";
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithWallet: (role?: string, extraFields?: Record<string, string>) => Promise<void>;
  signup: (email: string, password: string, name: string, role: UserRole, extraFields?: Record<string, string>) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

/**
 * Reads the user's role directly from the RoleManager contract.
 * Falls back to the backend-provided role if the contract address isn't set yet.
 */
const getRoleFromChain = async (walletAddress: string): Promise<UserRole> => {
  try {
    // Only query if the contract address is actually configured
    if (
      !CONTRACT_ADDRESSES.ROLE_MANAGER ||
      CONTRACT_ADDRESSES.ROLE_MANAGER === "0x0000000000000000000000000000000000000000"
    ) {
      return "CITIZEN";
    }
    const provider = new ethers.JsonRpcProvider(
      (import.meta as any).env.VITE_BLOCKCHAIN_RPC ||
      "https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"
    );
    const roleContract = new ethers.Contract(
      CONTRACT_ADDRESSES.ROLE_MANAGER,
      ROLE_MANAGER_ABI,
      provider
    );
    const roleId = await roleContract.getRole(walletAddress);
    return ROLE_MAP[Number(roleId)] || "CITIZEN";
  } catch (err) {
    console.warn("Could not read role from chain, falling back to DB role.", err);
    return "CITIZEN";
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("deid_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState(false);

  const persistUser = (u: User) => {
    setUser(u);
    localStorage.setItem("deid_user", JSON.stringify(u));
  };

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { token, user: userData } = await api.auth.login(email, password);
      // For email users, role comes from DB (email users have no wallet to check on-chain)
      const u: User = { ...userData, loginMethod: "email" as const };
      persistUser(u);
      localStorage.setItem("deid_token", token);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithWallet = useCallback(async (role?: string, extraFields?: Record<string, string>) => {
    setIsLoading(true);
    if (!(window as any).ethereum) {
      setIsLoading(false);
      throw new Error("MetaMask not installed. Please install MetaMask extension.");
    }
    try {
      // Request account access (shows MetaMask popup)
      const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
      const address = accounts[0];

      // 1. Get nonce — passes role + extra profile fields so backend saves them
      const { nonce } = await api.auth.getNonce(address, role, extraFields);

      // 2. Ask user to sign the nonce to prove wallet ownership
      const signature = await (window as any).ethereum.request({
        method: "personal_sign",
        params: [nonce, address],
      });

      // 3. Verify signature with backend — get JWT token + profile
      const { token, user: userData } = await api.auth.verifyWallet(address, signature);

      // 4. ✅ Read the REAL role from the blockchain (overrides DB role if mismatch)
      const chainRole = await getRoleFromChain(address);
      const effectiveRole: UserRole =
        chainRole !== "CITIZEN" ? chainRole : (userData.role as UserRole) || "CITIZEN";

      const u: User = {
        ...userData,
        role: effectiveRole,
        loginMethod: "wallet" as const,
      };
      persistUser(u);
      localStorage.setItem("deid_token", token);
    } catch (error: any) {
      console.error("Wallet connection error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string, role: UserRole, extraFields?: Record<string, string>) => {
    setIsLoading(true);
    try {
      const { token, user: userData } = await api.auth.signup(email, password, name, role, extraFields);
      const u: User = { ...userData, loginMethod: "email" as const };
      persistUser(u);
      localStorage.setItem("deid_token", token);
    } catch (error: any) {
      console.error("Signup error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("deid_user");
    localStorage.removeItem("deid_token");
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, loginWithWallet, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
