import { DynamicModule, Module, Global, Provider } from "@nestjs/common";
import { PluginManagerService } from "./plugin-manager.service";
import { FarmPlugin } from "./interfaces/plugin.interface";
import { PluginManagerController } from "./plugin-manager.controller";

@Global()
@Module({
  controllers: [PluginManagerController],
  providers: [PluginManagerService],
  exports: [PluginManagerService],
})
export class PluginManagerModule {
  /**
   * Configures the PluginManager with a list of plugins to load
   * @param plugins Array of FarmPlugin definitions
   */
  static forRoot(plugins: FarmPlugin[]): DynamicModule {
    const pluginModules = plugins.map((p) => p.module);

    const pluginProviders: Provider[] = [
      {
        provide: "INITIAL_PLUGINS",
        useFactory: (pluginManager: PluginManagerService) => {
          plugins.forEach((p) => pluginManager.register(p.metadata));
          return plugins;
        },
        inject: [PluginManagerService],
      },
    ];

    return {
      module: PluginManagerModule,
      imports: [...pluginModules],
      providers: [...pluginProviders],
    };
  }
}
