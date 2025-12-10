import { useState, useEffect, useCallback } from 'react';
import { HistoryItem, GeneratedResult } from '../types';

export const useHistory = (storageKey: string) => {
    // Initialize state with localStorage data immediately
    const [history, setHistory] = useState<HistoryItem[]>(() => {
        try {
            const storedHistory = localStorage.getItem(storageKey);
            if (storedHistory) {
                const parsed = JSON.parse(storedHistory);
                console.log(`[useHistory] Initial load for ${storageKey}:`, parsed.length, 'items');
                return parsed;
            }
        } catch (e) {
            console.error(`[useHistory] Failed to parse ${storageKey} from localStorage`, e);
        }
        console.log(`[useHistory] No data found for ${storageKey}, starting fresh`);
        return [];
    });

    // Save to localStorage whenever history changes
    useEffect(() => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(history));
            console.log(`[useHistory] Saved ${history.length} items to ${storageKey}`);
        } catch (e) {
            console.error(`[useHistory] Failed to save ${storageKey} to localStorage`, e);
        }
    }, [history, storageKey]);

    // Add Item
    const addToHistory = useCallback((result: GeneratedResult, summary?: string) => {
        const id = Date.now().toString();
        const newItem: HistoryItem = {
            id,
            timestamp: Date.now(),
            result,
            summary
        };

        setHistory(prev => [newItem, ...prev].slice(0, 50));
        return id;
    }, []);

    // Update Item
    const updateHistoryItem = useCallback((id: string, updates: Partial<HistoryItem>) => {
        setHistory(prev => prev.map(item => {
            if (item.id === id) {
                return { ...item, ...updates };
            }
            return item;
        }));
    }, []);

    // Remove Item
    const removeFromHistory = useCallback((id: string) => {
        setHistory(prev => prev.filter(item => item.id !== id));
    }, []);

    // Clear All
    const clearHistory = useCallback(() => {
        setHistory([]);
        localStorage.removeItem(storageKey);
    }, [storageKey]);

    return {
        history,
        addToHistory,
        updateHistoryItem,
        removeFromHistory,
        clearHistory
    };
};
