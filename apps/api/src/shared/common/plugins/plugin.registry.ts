import { Type, DynamicModule, Logger } from '@nestjs/common';

export interface PluginMetadata {
  name: string;

  version: string;

  description: string;

  author?: string;

  dependencies?: string[];

  requiredFeatureFlags?: string[];
}

export interface Plugin {
  metadata: PluginMetadata;

  module: Type<unknown> | DynamicModule;

  onInit?(): Promise<void>;
  onDestroy?(): Promise<void>;

  healthCheck?(): Promise<{ healthy: boolean; message?: string }>;
}

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

  register(plugin: Plugin): void {
    const { name, version, dependencies = [] } = plugin.metadata;

    if (this.plugins.has(name)) {
      throw new Error(`Plugin '${name}' is already registered`);
    }

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

  unregister(name: string): void {
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

  get(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  getAll(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  getModules(): (Type<unknown> | DynamicModule)[] {
    return this.getAll().map((p) => p.module);
  }

  async initializeAll(): Promise<void> {
    for (const name of this.initOrder) {
      const plugin = this.plugins.get(name);
      if (plugin?.onInit) {
        this.logger.log(`Initializing plugin: ${name}`);
        await plugin.onInit();
      }
    }
  }

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

export function getPluginRegistry(): PluginRegistry {
  return PluginRegistry.getInstance();
}

export function registerPlugin(plugin: Plugin): void {
  getPluginRegistry().register(plugin);
}

export function createPlugin(
  metadata: PluginMetadata,
  module: Type<unknown> | DynamicModule,
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
