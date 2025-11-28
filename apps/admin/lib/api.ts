import { Patient, Appointment } from "@workspace/types"

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001/api"

async function fetchAPI(endpoint: string, options?: RequestInit) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    })

    if (!response.ok) {
      throw new Error(response.statusText)
    }

    return await response.json()
  } catch (error) {
    console.error(`API request failed for ${endpoint}`, error)
    throw error
  }
}

export const patientsAPI = {
  getAll: (): Promise<Patient[]> => fetchAPI("/patients"),
  getOne: (id: string): Promise<Patient> => fetchAPI(`/patients/${id}`),
  create: (data: Omit<Patient, "id" | "createdAt" | "updatedAt">): Promise<Patient> =>
    fetchAPI("/patients", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<Omit<Patient, "id" | "createdAt" | "updatedAt">>): Promise<Patient> =>
    fetchAPI(`/patients/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string): Promise<void> =>
    fetchAPI(`/patients/${id}`, {
      method: "DELETE",
    }),
}

export const appointmentsAPI = {
  getAll: (): Promise<Appointment[]> => fetchAPI("/appointments"),
  getOne: (id: string): Promise<Appointment> => fetchAPI(`/appointments/${id}`),
  create: (data: Omit<Appointment, "id" | "createdAt" | "updatedAt">): Promise<Appointment> =>
    fetchAPI("/appointments", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<Omit<Appointment, "id" | "createdAt" | "updatedAt">>): Promise<Appointment> =>
    fetchAPI(`/appointments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string): Promise<void> =>
    fetchAPI(`/appointments/${id}`, {
      method: "DELETE",
    }),
}
