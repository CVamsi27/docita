"use client"

import { useState, useEffect } from "react"
import { ChevronsUpDown, Search, Star } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"


import type { IcdCode } from "@/types"
import { useDebounce } from "@/hooks/use-debounce"

interface IcdCodeSearchProps {
  onSelect: (code: IcdCode) => void
  placeholder?: string
  className?: string
}

export function IcdCodeSearch({ onSelect, placeholder = "Search diagnosis...", className }: IcdCodeSearchProps) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [codes, setCodes] = useState<IcdCode[]>([])
  const [favorites, setFavorites] = useState<IcdCode[]>([])
  const [loading, setLoading] = useState(false)
  
  const debouncedSearch = useDebounce(searchQuery, 300)

  // Load favorites on mount
  useEffect(() => {
    loadFavorites()
  }, [])

  // Search codes when query changes
  useEffect(() => {
    if (debouncedSearch.length >= 2) {
      searchCodes(debouncedSearch)
    } else {
      setCodes([])
    }
  }, [debouncedSearch])

  const loadFavorites = async () => {
    try {
      // TODO: Implement favorites API
      // const response = await api.get<IcdCode[]>('/medical-coding/favorites')
      // setFavorites(response)
      
      // Mock data for now
      setFavorites([
        { id: '1', code: 'I10', description: 'Essential (primary) hypertension', category: 'Circulatory', version: 'ICD-10', createdAt: '', updatedAt: '' },
        { id: '2', code: 'E11', description: 'Type 2 diabetes mellitus', category: 'Endocrine', version: 'ICD-10', createdAt: '', updatedAt: '' },
      ])
    } catch (error) {
      console.error("Failed to load favorites:", error)
    }
  }

  const searchCodes = async (query: string) => {
    try {
      setLoading(true)
      // TODO: Implement search API
      // const response = await api.get<IcdCode[]>(`/medical-coding/icd-codes?search=${query}`)
      // setCodes(response)
      
      // Mock search for now
      await new Promise(resolve => setTimeout(resolve, 500))
      setCodes([
        { id: '3', code: 'J06.9', description: 'Acute upper respiratory infection, unspecified', category: 'Respiratory', version: 'ICD-10', createdAt: '', updatedAt: '' },
        { id: '4', code: 'R50.9', description: 'Fever, unspecified', category: 'Symptoms', version: 'ICD-10', createdAt: '', updatedAt: '' },
        { id: '5', code: 'A41.9', description: 'Sepsis, unspecified organism', category: 'Infectious', version: 'ICD-10', createdAt: '', updatedAt: '' },
      ].filter(c => 
        c.code.toLowerCase().includes(query.toLowerCase()) || 
        c.description.toLowerCase().includes(query.toLowerCase())
      ))
    } catch (error) {
      console.error("Failed to search codes:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {value ? value : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search by code or description..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              {loading ? "Searching..." : "No diagnosis found."}
            </CommandEmpty>
            
            {!searchQuery && favorites.length > 0 && (
              <CommandGroup heading="Favorites">
                {favorites.map((code) => (
                  <CommandItem
                    key={code.id}
                    value={code.code}
                    onSelect={() => {
                      onSelect(code)
                      setValue(`${code.code} - ${code.description}`)
                      setOpen(false)
                    }}
                  >
                    <Star className="mr-2 h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-mono font-bold mr-2">{code.code}</span>
                    <span className="truncate">{code.description}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {codes.length > 0 && (
              <CommandGroup heading="Search Results">
                {codes.map((code) => (
                  <CommandItem
                    key={code.id}
                    value={code.code}
                    onSelect={() => {
                      onSelect(code)
                      setValue(`${code.code} - ${code.description}`)
                      setOpen(false)
                    }}
                  >
                    <Search className="mr-2 h-4 w-4 opacity-50" />
                    <span className="font-mono font-bold mr-2">{code.code}</span>
                    <span className="truncate">{code.description}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
