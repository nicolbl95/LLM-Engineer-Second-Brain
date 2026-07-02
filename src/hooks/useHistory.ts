import { useCallback, useEffect, useRef } from "react";

export interface HistoryState {
  nodes: any[];
  edges: any[];
}

export interface UseHistoryOptions {
  maxHistory: number;
  onStateChange: (state: HistoryState) => void;
}

export interface UseHistoryReturn {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  pushState: (state: HistoryState) => void;
}

/**
 * Custom hook for managing undo/redo history.
 * Tracks state changes and allows reverting or re-applying them.
 */
export function useHistory({ maxHistory = 50, onStateChange }: UseHistoryOptions): UseHistoryReturn {
  const historyRef = useRef<HistoryState[]>([]);
  const currentIndexRef = useRef(-1);
  const isApplyingRef = useRef(false);
  const lastPushedStateRef = useRef<string>("");

  const pushState = useCallback((state: HistoryState) => {
    if (isApplyingRef.current) return;

    // Serialize state to detect actual changes
    const stateString = JSON.stringify(state);
    if (stateString === lastPushedStateRef.current) {
      return; // Don't push duplicate states
    }

    // Initialize history with first state if empty
    if (historyRef.current.length === 0) {
      historyRef.current.push(JSON.parse(JSON.stringify(state)));
      lastPushedStateRef.current = stateString;
      currentIndexRef.current = 0;
      return;
    }

    // Remove any future states if we're not at the end
    if (currentIndexRef.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, currentIndexRef.current + 1);
    }

    // Add new state
    historyRef.current.push(JSON.parse(JSON.stringify(state)));
    lastPushedStateRef.current = stateString;
    
    // Limit history size
    if (historyRef.current.length > maxHistory) {
      historyRef.current.shift();
    } else {
      currentIndexRef.current++;
    }

    // Ensure we don't exceed maxHistory
    currentIndexRef.current = Math.min(currentIndexRef.current, historyRef.current.length - 1);
  }, [maxHistory]);

  const performUndo = useCallback(() => {
    if (currentIndexRef.current > 0) {
      isApplyingRef.current = true;
      currentIndexRef.current--;
      const state = historyRef.current[currentIndexRef.current];
      onStateChange(JSON.parse(JSON.stringify(state)));
      setTimeout(() => {
        isApplyingRef.current = false;
      }, 0);
    }
  }, [onStateChange]);

  const performRedo = useCallback(() => {
    if (currentIndexRef.current < historyRef.current.length - 1) {
      isApplyingRef.current = true;
      currentIndexRef.current++;
      const state = historyRef.current[currentIndexRef.current];
      onStateChange(JSON.parse(JSON.stringify(state)));
      setTimeout(() => {
        isApplyingRef.current = false;
      }, 0);
    }
  }, [onStateChange]);

  const canUndo = currentIndexRef.current > 0;
  const canRedo = currentIndexRef.current < historyRef.current.length - 1;

  // Keyboard shortcuts - use refs to always have latest functions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (modKey && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        performUndo();
      } else if (
        (modKey && e.shiftKey && e.key === "z") ||
        (modKey && e.key === "y")
      ) {
        e.preventDefault();
        performRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [performUndo, performRedo]);

  return {
    undo: performUndo,
    redo: performRedo,
    canUndo,
    canRedo,
    pushState,
  };
}
