import { DynamicModule, Module, Global, Provider } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PluginManagerService } from "./plugin-manager.service";
import { FarmPlugin } from "./interfaces/plugin.interface";
import { PluginManagerController } from "./plugin-manager.controller";
import { PluginInstance } from "./entities/plugin-instance.entity";
import { PluginRegistryEntry } from "./entities/plugin-registry-entry.entity";
import { PluginValidatorService } from "./services/plugin-validator.service";
import { PluginInstanceService } from "./services/plugin-instance.service";
import { PluginRegistryService } from "./services/plugin-registry.service";

@Global()
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([PluginInstance, PluginRegistryEntry]),
  ],
  controllers: [PluginManagerController],
  providers: [
    PluginManagerService,
    PluginValidatorService,
    PluginInstanceService,
    PluginRegistryService,
  ],
  exports: [
    PluginManagerService,
    PluginValidatorService,
    PluginInstanceService,
    PluginRegistryService,
  ],
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
