"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
})

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // In a real app, you'd get the token from auth context or local storage
    const token = typeof window !== 'undefined' ? localStorage.getItem('docita_token') : null
    
    // Only connect if we have a token or if we want public access (depending on security model)
    // For now, we'll connect regardless but auth is handled on server
    
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001'
    const socketInstance = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    })

    socketInstance.on('connect', () => {
      console.log('Socket connected')
      setIsConnected(true)
    })

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected')
      setIsConnected(false)
    })

    socketInstance.on('connect_error', (err) => {
      console.error('Socket connection error:', err)
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
    }
  }, [])

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => useContext(SocketContext)
