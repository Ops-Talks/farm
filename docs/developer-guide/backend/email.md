# Email Service

Farm includes a built-in email service for sending transactional notifications using SMTP and Handlebars templates.

## Architecture

The email service consists of three main components:

- **EmailService** (`src/common/email/email.service.ts`) -- Core service that manages the SMTP transporter and template rendering.
- **EmailModule** (`src/common/email/email.module.ts`) -- Global module that provides EmailService to the entire application.
- **NotificationProcessor** (`src/common/queues/notification.processor.ts`) -- BullMQ processor that sends emails asynchronously via the notification queue.

## Configuration

Email sending is **opt-in**. When `SMTP_HOST` is not set, the service logs a warning and silently skips all email operations.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SMTP_HOST` | No | _(empty)_ | SMTP server hostname. Leave empty to disable email. |
| `SMTP_PORT` | No | `587` | SMTP server port. |
| `SMTP_SECURE` | No | `false` | Use TLS (`true` for port 465). |
| `SMTP_USER` | No | _(empty)_ | SMTP authentication username. |
| `SMTP_PASS` | No | _(empty)_ | SMTP authentication password. |
| `SMTP_FROM` | No | `Farm <noreply@farm.local>` | Default sender address. |

### Example Configuration

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=notifications@example.com
SMTP_PASS=your-smtp-password
SMTP_FROM=Farm Platform <notifications@example.com>
```

### Local Development with MailHog

For local development, [MailHog](https://github.com/mailhog/MailHog) provides a fake SMTP server with a web UI:

```bash
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog
```

Then configure:

```env
SMTP_HOST=localhost
SMTP_PORT=1025
```

View captured emails at `http://localhost:8025`.

## Email Templates

Templates use [Handlebars](https://handlebarsjs.com/) syntax and are located in `src/common/email/templates/`.

### Available Templates

| Template | File | Description |
|----------|------|-------------|
| `welcome` | `welcome.hbs` | Welcome email for new user registration |
| `deployment-notification` | `deployment-notification.hbs` | Deployment status notification |

### Layout

All templates are wrapped in a shared layout (`layout.hbs`) that provides consistent header, footer, and styling. The layout receives:

- `subject` -- Email subject line (used in the HTML title).
- `body` -- Rendered template content (triple-braced `{{{body}}}` for raw HTML).

### Adding a New Template

1. Create a new `.hbs` file in `src/common/email/templates/`:

    ```handlebars
    <h2>{{title}}</h2>
    <p>Hello {{name}}, your action was completed.</p>
    ```

2. The template is automatically loaded on application startup. Reference it by filename (without extension) when sending emails.

## Sending Emails

### Direct (Synchronous)

Inject `EmailService` into any service:

```typescript
import { EmailService } from "../common/email/email.service";

@Injectable()
export class MyService {
  constructor(private readonly emailService: EmailService) {}

  async notifyUser(email: string, name: string): Promise<void> {
    await this.emailService.sendMail({
      to: email,
      subject: "Action Completed",
      template: "welcome",
      context: { displayName: name, username: name, email, role: "user" },
    });
  }
}
```

### Async (via Notification Queue)

For non-blocking email delivery, enqueue a notification job:

```typescript
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { QUEUE_NAMES } from "../common/queues/queues.module";

@Injectable()
export class MyService {
  constructor(
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS)
    private readonly notificationQueue: Queue,
  ) {}

  async notifyUser(email: string): Promise<void> {
    await this.notificationQueue.add("email", {
      type: "email",
      recipient: email,
      subject: "Welcome to Farm",
      template: "welcome",
      payload: {
        displayName: "New User",
        username: "newuser",
        email,
        role: "user",
      },
    });
  }
}
```

The `NotificationProcessor` picks up the job from Redis and calls `EmailService.sendMail()` with the provided template and context.

### Job Data Interface

```typescript
interface NotificationJobData {
  type: "email" | "webhook";
  recipient: string;
  subject: string;
  template?: string;        // Handlebars template name (default: "welcome")
  payload: Record<string, unknown>;  // Template context variables
}
```

## Graceful Degradation

The email service is designed to never break the application:

- **No SMTP configured**: Logs a warning on startup, returns `false` from `sendMail()`.
- **SMTP verification fails**: Logs an error, disables the transporter, returns `false`.
- **Send failure**: Catches the error, logs it, returns `false`.
- **Unknown template**: Logs an error, returns `false`.
- **NotificationProcessor without EmailService**: Logs a warning, skips the job.

Use `emailService.isEnabled()` to check if email sending is operational.
