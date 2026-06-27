import { DefaultNamingStrategy, NamingStrategyInterface } from "typeorm";
import { snakeCase } from "typeorm/util/StringUtils";

export class SnakeNamingStrategy
  extends DefaultNamingStrategy
  implements NamingStrategyInterface
{
  override tableName(className: string, customName?: string): string {
    return customName ?? snakeCase(className);
  }

  override columnName(
    propertyName: string,
    customName?: string,
    embeddedPrefixes: string[] = [],
  ): string {
    return (
      customName ??
      snakeCase(
        embeddedPrefixes.length > 0
          ? embeddedPrefixes.join("_") + "_" + propertyName
          : propertyName,
      )
    );
  }

  override relationName(propertyName: string): string {
    return snakeCase(propertyName);
  }

  override joinColumnName(
    relationName: string,
    referencedColumnName: string,
  ): string {
    return snakeCase(relationName + "_" + referencedColumnName);
  }

  override joinTableName(
    firstTableName: string,
    secondTableName: string,
  ): string {
    return snakeCase(firstTableName + "_" + secondTableName);
  }

  override joinTableColumnName(
    tableName: string,
    propertyName: string,
    columnName?: string,
  ): string {
    return snakeCase(tableName + "_" + (columnName ?? propertyName));
  }
}
