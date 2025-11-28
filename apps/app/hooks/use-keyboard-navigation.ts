import { useEffect, useCallback, RefObject } from 'react'

/**
 * Hook for keyboard navigation support
 * Handles arrow keys, Enter, Escape, and Tab navigation
 */
export function useKeyboardNavigation(
    containerRef: RefObject<HTMLElement>,
    options: {
        onEnter?: () => void
        onEscape?: () => void
        onArrowUp?: () => void
        onArrowDown?: () => void
        enabled?: boolean
    } = {}
) {
    const { onEnter, onEscape, onArrowUp, onArrowDown, enabled = true } = options

    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (!enabled) return

            switch (event.key) {
                case 'Enter':
                    if (onEnter) {
                        event.preventDefault()
                        onEnter()
                    }
                    break
                case 'Escape':
                    if (onEscape) {
                        event.preventDefault()
                        onEscape()
                    }
                    break
                case 'ArrowUp':
                    if (onArrowUp) {
                        event.preventDefault()
                        onArrowUp()
                    }
                    break
                case 'ArrowDown':
                    if (onArrowDown) {
                        event.preventDefault()
                        onArrowDown()
                    }
                    break
            }
        },
        [enabled, onEnter, onEscape, onArrowUp, onArrowDown]
    )

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        container.addEventListener('keydown', handleKeyDown)
        return () => container.removeEventListener('keydown', handleKeyDown)
    }, [containerRef, handleKeyDown])
}

/**
 * Hook for focus trap (useful for modals/dialogs)
 */
export function useFocusTrap(
    containerRef: RefObject<HTMLElement>,
    isActive: boolean = true
) {
    useEffect(() => {
        if (!isActive) return

        const container = containerRef.current
        if (!container) return

        const focusableElements = container.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )

        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        const handleTabKey = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return

            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault()
                    lastElement?.focus()
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault()
                    firstElement?.focus()
                }
            }
        }

        container.addEventListener('keydown', handleTabKey)
        firstElement?.focus()

        return () => container.removeEventListener('keydown', handleTabKey)
    }, [containerRef, isActive])
}
