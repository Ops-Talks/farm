import { Injectable, BadRequestException } from "@nestjs/common";
import * as nunjucks from "nunjucks";
import { camelCase, snakeCase, kebabCase, pascalCase } from "change-case";

/**
 * Service responsible for rendering Nunjucks templates with custom
 * case-transformation filters for file path and identifier generation.
 */
@Injectable()
export class TemplateEngineService {
  private readonly env: nunjucks.Environment;

  constructor() {
    // No file loader — renderString only, prevents filesystem access.
    this.env = new nunjucks.Environment(null, { autoescape: false });

    this.env.addFilter("camelCase", (str: string) => camelCase(str ?? ""));
    this.env.addFilter("snakeCase", (str: string) => snakeCase(str ?? ""));
    this.env.addFilter("kebabCase", (str: string) => kebabCase(str ?? ""));
    this.env.addFilter("pascalCase", (str: string) => pascalCase(str ?? ""));
  }

  /**
   * Renders a Nunjucks template string with the provided variables.
   * Custom filters available: camelCase, snakeCase, kebabCase, pascalCase.
   * @param template - The Nunjucks template string to render
   * @param vars - Variables to expose inside the template
   * @returns The rendered output string
   * @throws BadRequestException if the template contains invalid syntax
   */
  render(template: string, vars: Record<string, unknown>): string {
    try {
      return this.env.renderString(template, vars);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(`Template rendering failed: ${message}`);
    }
  }
}
