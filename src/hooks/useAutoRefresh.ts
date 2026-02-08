"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UseAutoRefreshOptions {
  /** Refresh interval in milliseconds (default: 5 minutes) */
  interval?: number;
  /** Whether auto-refresh is enabled (default: true) */
  enabled?: boolean;
  /** Callback function to run on each refresh */
  onRefresh: () => Promise<void>;
}

interface UseAutoRefreshReturn {
  /** Whether a refresh is currently in progress */
  isRefreshing: boolean;
  /** Timestamp of the last successful refresh */
  lastRefreshTime: Date | null;
  /** Time until next refresh in seconds */
  nextRefreshIn: number;
  /** Whether auto-refresh is currently enabled */
  isEnabled: boolean;
  /** Toggle auto-refresh on/off */
  toggle: () => void;
  /** Trigger an immediate refresh */
  refreshNow: () => Promise<void>;
}

export function useAutoRefresh({
  interval = 5 * 60 * 1000, // 5 minutes default
  enabled = true,
  onRefresh,
}: UseAutoRefreshOptions): UseAutoRefreshReturn {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [nextRefreshIn, setNextRefreshIn] = useState(interval / 1000);
  const [isEnabled, setIsEnabled] = useState(enabled);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const doRefresh = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      await onRefresh();
      setLastRefreshTime(new Date());
      setNextRefreshIn(interval / 1000);
    } catch (error) {
      console.error("Auto-refresh failed:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh, interval, isRefreshing]);

  // Main refresh interval
  useEffect(() => {
    if (!isEnabled) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(doRefresh, interval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isEnabled, interval, doRefresh]);

  // Countdown timer
  useEffect(() => {
    if (!isEnabled) {
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }

    countdownRef.current = setInterval(() => {
      setNextRefreshIn((prev) => {
        if (prev <= 1) return interval / 1000;
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [isEnabled, interval]);

  const toggle = useCallback(() => {
    setIsEnabled((prev) => !prev);
  }, []);

  const refreshNow = useCallback(async () => {
    await doRefresh();
  }, [doRefresh]);

  return {
    isRefreshing,
    lastRefreshTime,
    nextRefreshIn,
    isEnabled,
    toggle,
    refreshNow,
  };
}