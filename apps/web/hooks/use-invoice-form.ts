import { useState } from "react"
import { LineItem } from "@workspace/types"
import { API_URL } from "@/lib/api"

interface UseInvoiceFormProps {
    appointmentId?: string
    patientId: string
    onInvoiceCreated?: () => void
}

export function useInvoiceForm({ appointmentId, patientId, onInvoiceCreated }: UseInvoiceFormProps) {
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState("pending")
    const [items, setItems] = useState<LineItem[]>([
        { description: "Consultation Fee", quantity: 1, price: 800 }
    ])

    const addItem = () => {
        setItems([...items, { description: "", quantity: 1, price: 0 }])
    }

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index))
    }

    const updateItem = (index: number, field: keyof LineItem, value: string | number) => {
        const updated = [...items]
        if (updated[index]) {
            updated[index][field] = value as never
            setItems(updated)
        }
    }

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
    }

    const handleSubmit = async (e: React.FormEvent, onSuccess?: () => void) => {
        e.preventDefault()
        setLoading(true)

        try {
            const response = await fetch(`${API_URL}/invoices`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    appointmentId,
                    patientId,
                    total: calculateTotal(),
                    status,
                    items: items.filter(item => item.description.trim() !== ""),
                }),
            })

            if (response.ok) {
                setItems([{ description: "Consultation Fee", quantity: 1, price: 800 }])
                setStatus("pending")
                onInvoiceCreated?.()
                onSuccess?.()
            }
        } catch (error) {
            console.error("Failed to create invoice:", error)
        } finally {
            setLoading(false)
        }
    }

    return {
        loading,
        status,
        setStatus,
        items,
        addItem,
        removeItem,
        updateItem,
        calculateTotal,
        handleSubmit,
    }
}
