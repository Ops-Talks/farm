import { Logger, BadGatewayException } from "@nestjs/common";
import { ClassConstructor, plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";

export function validateResponse<T extends object>(
  dto: ClassConstructor<T>,
  data: unknown,
  operation: string,
  logger: Logger,
): T {
  const instance = plainToInstance(dto, data, {
    excludeExtraneousValues: false,
  });
  const errors = validateSync(instance, {
    whitelist: true,
    forbidNonWhitelisted: false,
  });
  if (errors.length > 0) {
    const messages = errors
      .map(
        (e) =>
          `${e.property}: ${Object.values(e.constraints ?? {}).join(", ")}`,
      )
      .join("; ");
    logger.error(`${operation}: response validation failed — ${messages}`);
    throw new BadGatewayException(
      `${operation}: invalid response from upstream service`,
    );
  }
  return instance;
}
