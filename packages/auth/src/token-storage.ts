

export const tokenStorage = {
  
  getToken: (): string | null => {

    return null;
  },

  
  setToken: (_token: string): void => {

    
  },

  
  clearToken: (): void => {

  },

  
  refreshToken: async (): Promise<void> => {
    const response = await fetch("/api/v1/auth/refresh", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error("Token refresh failed");
    }
  },

  
  getCsrfToken: (): string | null => {
    const token = document
      .querySelector('meta[name="csrf-token"]')
      ?.getAttribute("content");
    return token || null;
  },
};
