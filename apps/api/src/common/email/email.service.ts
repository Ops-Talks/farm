import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import * as Handlebars from "handlebars";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface SendMailOptions {
  to: string;
  subject: string;
  template: string;
  context: Record<string, unknown>;
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private layoutTemplate: Handlebars.TemplateDelegate | null = null;
  private readonly templates = new Map<string, Handlebars.TemplateDelegate>();
  private readonly from: string;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>("smtp.host");
    this.from =
      this.configService.get<string>("smtp.from") ??
      "Farm <noreply@farm.local>";
    this.enabled = !!host;
  }

  async onModuleInit(): Promise<void> {
    this.loadTemplates();

    if (!this.enabled) {
      this.logger.log("SMTP_HOST not configured. Email sending is disabled.");
      return;
    }

    const host = this.configService.get<string>("smtp.host");
    const port = this.configService.get<number>("smtp.port") ?? 587;
    const secure = this.configService.get<boolean>("smtp.secure") ?? false;
    const user = this.configService.get<string>("smtp.user");
    const pass = this.configService.get<string>("smtp.pass");

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      ...(user && pass ? { auth: { user, pass } } : {}),
    });

    try {
      await this.transporter.verify();
      this.logger.log(`SMTP connection verified (${host}:${port})`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`SMTP connection failed: ${message}`);
      this.transporter = null;
    }
  }

  isEnabled(): boolean {
    return this.enabled && this.transporter !== null;
  }

  async sendMail(options: SendMailOptions): Promise<boolean> {
    if (!this.transporter) {
      this.logger.debug(
        `Email not sent (SMTP disabled): "${options.subject}" to ${options.to}`,
      );
      return false;
    }

    const template = this.templates.get(options.template);
    if (!template) {
      this.logger.error(`Email template "${options.template}" not found`);
      return false;
    }

    const body = template(options.context);
    const html = this.layoutTemplate
      ? this.layoutTemplate({ subject: options.subject, body })
      : body;

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: options.to,
        subject: options.subject,
        html,
      });
      this.logger.log(`Email sent: "${options.subject}" to ${options.to}`);
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send email "${options.subject}" to ${options.to}: ${message}`,
      );
      return false;
    }
  }

  private loadTemplates(): void {
    const templatesDir = path.join(__dirname, "templates");

    if (!fs.existsSync(templatesDir)) {
      this.logger.warn(`Templates directory not found: ${templatesDir}`);
      return;
    }

    const layoutPath = path.join(templatesDir, "layout.hbs");
    if (fs.existsSync(layoutPath)) {
      const layoutSource = fs.readFileSync(layoutPath, "utf-8");
      this.layoutTemplate = Handlebars.compile(layoutSource);
    }

    const files = fs
      .readdirSync(templatesDir)
      .filter((f) => f.endsWith(".hbs") && f !== "layout.hbs");

    for (const file of files) {
      const name = path.basename(file, ".hbs");
      const source = fs.readFileSync(path.join(templatesDir, file), "utf-8");
      this.templates.set(name, Handlebars.compile(source));
    }

    this.logger.log(
      `Loaded ${this.templates.size} email template(s): ${[...this.templates.keys()].join(", ")}`,
    );
  }
}
