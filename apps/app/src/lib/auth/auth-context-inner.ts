import { createContext } from "react";
import type { AuthContextType } from "./auth-context.types";

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
