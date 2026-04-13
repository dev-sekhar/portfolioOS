export const RUNTIME_SETTINGS = {
    session: {
        // Auto sign-out after this many minutes without user activity.
        inactivityTimeoutMinutes: 5,
        activityRefreshThrottleMs: 15000,
    },
    arbitrage: {
        trendWindowPoints: 20,
        refreshIntervalMs: 20000,
    },
};
