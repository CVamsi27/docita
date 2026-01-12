import { Type, DynamicModule, Logger } from '@nestjs/common';

/**
 * Plugin Metadata
 */
export interface PluginMetadata {
  /** Unique plugin identifier */
  name: string;
  /** Semantic version */
  version: string;
  /** Human-readable description */
  description: string;
  /** Plugin author */
  author?: string;
  /** Required plugins (by name) */
  dependencies?: string[];
  /** Required feature flags */
  requiredFeatureFlags?: string[];
}

/**
 * Plugin Interface
 *
 * Implement this interface to create a plugin for Docita.
 */
export interface Plugin {
  /** Plugin metadata */
  metadata: PluginMetadata;
  /** NestJS module */
  module: Type<any> | DynamicModule;
  /** Lifecycle hooks */
  onInit?(): Promise<void>;
  onDestroy?(): Promise<void>;
  /** Health check */
  healthCheck?(): Promise<{ healthy: boolean; message?: string }>;
}

/**
 * Plugin Registry
 *
 * Manages plugin registration and lifecycle.
 */
export class PluginRegistry {
  private static instance: PluginRegistry;
  private readonly logger = new Logger(PluginRegistry.name);
  private plugins: Map<string, Plugin> = new Map();
  private initOrder: string[] = [];

  private constructor() {}

  static getInstance(): PluginRegistry {
    if (!PluginRegistry.instance) {
      PluginRegistry.instance = new PluginRegistry();
    }
    return PluginRegistry.instance;
  }

  /**
   * Register a plugin
   */
  register(plugin: Plugin): void {
    const { name, version, dependencies = [] } = plugin.metadata;

    if (this.plugins.has(name)) {
      throw new Error(`Plugin '${name}' is already registered`);
    }

    // Validate dependencies
    for (const dep of dependencies) {
      if (!this.plugins.has(dep)) {
        throw new Error(
          `Plugin '${name}' requires '${dep}' which is not registered`,
        );
      }
    }

    this.plugins.set(name, plugin);
    this.initOrder.push(name);
    this.logger.log(`Registered plugin: ${name} v${version}`);
  }

  /**
   * Unregister a plugin
   */
  unregister(name: string): void {
    // Check for dependents
    for (const [pluginName, plugin] of this.plugins) {
      if (plugin.metadata.dependencies?.includes(name)) {
        throw new Error(
          `Cannot unregister '${name}': '${pluginName}' depends on it`,
        );
      }
    }

    this.plugins.delete(name);
    this.initOrder = this.initOrder.filter((n) => n !== name);
    this.logger.log(`Unregistered plugin: ${name}`);
  }

  /**
   * Get a registered plugin
   */
  get(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Get all registered plugins
   */
  getAll(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get all plugin modules for import
   */
  getModules(): (Type<any> | DynamicModule)[] {
    return this.getAll().map((p) => p.module);
  }

  /**
   * Initialize all plugins (in dependency order)
   */
  async initializeAll(): Promise<void> {
    for (const name of this.initOrder) {
      const plugin = this.plugins.get(name);
      if (plugin?.onInit) {
        this.logger.log(`Initializing plugin: ${name}`);
        await plugin.onInit();
      }
    }
  }

  /**
   * Destroy all plugins (in reverse order)
   */
  async destroyAll(): Promise<void> {
    const reverseOrder = [...this.initOrder].reverse();
    for (const name of reverseOrder) {
      const plugin = this.plugins.get(name);
      if (plugin?.onDestroy) {
        this.logger.log(`Destroying plugin: ${name}`);
        await plugin.onDestroy();
      }
    }
  }

  /**
   * Health check all plugins
   */
  async healthCheckAll(): Promise<
    Record<string, { healthy: boolean; message?: string }>
  > {
    const results: Record<string, { healthy: boolean; message?: string }> = {};

    for (const [name, plugin] of this.plugins) {
      if (plugin.healthCheck) {
        try {
          results[name] = await plugin.healthCheck();
        } catch (error) {
          results[name] = {
            healthy: false,
            message: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      } else {
        results[name] = { healthy: true };
      }
    }

    return results;
  }
}

/**
 * Get the global plugin registry
 */
export function getPluginRegistry(): PluginRegistry {
  return PluginRegistry.getInstance();
}

/**
 * Register a plugin
 */
export function registerPlugin(plugin: Plugin): void {
  getPluginRegistry().register(plugin);
}

/**
 * Create a plugin from a module
 */
export function createPlugin(
  metadata: PluginMetadata,
  module: Type<any> | DynamicModule,
  hooks?: {
    onInit?: () => Promise<void>;
    onDestroy?: () => Promise<void>;
    healthCheck?: () => Promise<{ healthy: boolean; message?: string }>;
  },
): Plugin {
  return {
    metadata,
    module,
    ...hooks,
  };
}
