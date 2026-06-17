import { NestFactory } from "@nestjs/core";
import { SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "../src/app.module";
import { createSwaggerConfig } from "../src/common/swagger/swagger-config";
import * as fs from "fs";
import * as path from "path";

async function generate(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });

  const config = createSwaggerConfig();
  const document = SwaggerModule.createDocument(app, config);

  const outputPath = path.join(__dirname, "..", "openapi.json");
  fs.writeFileSync(outputPath, JSON.stringify(document, null, 2), "utf-8");
  console.error(`openapi.json written to ${outputPath}`);

  await app.close();
}

void generate().catch((err: unknown) => {
  console.error("Failed to generate openapi.json", err);
  process.exit(1);
});
