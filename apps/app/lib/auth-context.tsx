"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { usePermissionStore } from "@/lib/stores/permission-store"

interface User {
  id: string
  name: string
  email: string
  role: "doctor" | "receptionist" | "admin" | "ADMIN_DOCTOR"
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  isAdmin: boolean
  isDoctor: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  token: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { setUserRole } = usePermissionStore()

  useEffect(() => {
    const storedToken = localStorage.getItem("docita_token")
    const storedUser = localStorage.getItem("docita_user")
    
    if (storedToken && storedUser && storedUser !== "undefined") {
      try {
        setToken(storedToken)
        const parsedUser = JSON.parse(storedUser)
        setUser(parsedUser)
        setUserRole(parsedUser.role)
      } catch (error) {
        console.error("Failed to parse user data:", error)
        localStorage.removeItem("docita_token")
        localStorage.removeItem("docita_user")
      }
    }
    setIsLoading(false)
  }, [setUserRole])

  const login = async (email: string, password: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        throw new Error("Login failed")
      }

      const data = await response.json()
      const { access_token, user } = data

      setToken(access_token)
      setUser(user)
      setUserRole(user.role)
      localStorage.setItem("docita_token", access_token)
      localStorage.setItem("docita_user", JSON.stringify(user))
      
      // Redirect to originally requested page or dashboard
      const redirectUrl = sessionStorage.getItem("redirectAfterLogin") || "/"
      sessionStorage.removeItem("redirectAfterLogin")
      router.push(redirectUrl)
    } catch (error) {
      console.error("Login error:", error)
      throw error
    }
  }
// ...

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem("docita_token")
    localStorage.removeItem("docita_user")
    router.push("/login")
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isAdmin: user?.role === 'admin' || user?.role === 'ADMIN_DOCTOR',
        isDoctor: user?.role === 'doctor' || user?.role === 'ADMIN_DOCTOR',
        login,
        logout,
        token,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
