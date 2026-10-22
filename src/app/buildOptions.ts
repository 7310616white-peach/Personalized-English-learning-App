/** Demo entry points are opt-in for development; normal Web/APK builds keep them hidden. */
export const demoFeaturesEnabled = import.meta.env.VITE_ENABLE_DEMOS === 'true';
