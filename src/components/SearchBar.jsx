import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { MagnifyingGlass, X } from '@phosphor-icons/react'

export function SearchBar({ onSearch, onSelectResult, results, isSearching }) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const searchRef = useRef(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) {
        onSearch(query)
        setIsOpen(true)
      } else {
        setIsOpen(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, onSearch])

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleClear = () => {
    setQuery('')
    setIsOpen(false)
  }

  const handleSelect = (result) => {
    onSelectResult(result)
    setQuery('')
    setIsOpen(false)
  }

  return (
    <div ref={searchRef} className="relative w-full max-w-2xl">
      <div className="relative">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
        <Input
          type="text"
          placeholder="Search for foods... (e.g., apple, chicken breast, whole wheat bread)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-10 h-12 bg-secondary/50 border-border"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
            onClick={handleClear}
          >
            <X size={16} />
          </Button>
        )}
      </div>

      {isOpen && (query || isSearching) && (
        <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-lg shadow-lg z-50">
          <ScrollArea className="max-h-96">
            {isSearching ? (
              <div className="p-3 space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="p-3 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : results.length > 0 ? (
              <div className="py-2">
                {results.map((result) => (
                  <button
                    key={result.fdcId}
                    onClick={() => handleSelect(result)}
                    className="w-full px-4 py-3 text-left hover:bg-secondary/50 transition-colors"
                  >
                    <div className="font-medium text-foreground line-clamp-1">
                      {result.description}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {result.dataType}
                      </Badge>
                      {result.foodCategory && (
                        <span className="text-xs text-muted-foreground">
                          {result.foodCategory}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                No foods found. Try a different search term.
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
