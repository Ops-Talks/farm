/**
 * Lifecycle hook called after a plugin instance transitions to the active status.
 * Implement this interface in any service that needs to perform setup when a
 * plugin is enabled or first installed.
 */
export interface OnPluginInit {
  onPluginInit(): Promise<void>;
}

/**
 * Lifecycle hook called before a plugin instance transitions to disabled or
 * is uninstalled. Implement this interface to perform cleanup such as
 * releasing resources or stopping background tasks.
 */
export interface OnPluginDestroy {
  onPluginDestroy(): Promise<void>;
}
