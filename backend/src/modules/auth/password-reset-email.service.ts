import { Injectable, Logger } from '@nestjs/common';

export type PasswordResetEmailInput = {
  email: string;
  expiresAt: Date;
  resetUrl: string;
};

@Injectable()
export class PasswordResetEmailService {
  private readonly logger = new Logger(PasswordResetEmailService.name);

  async sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<void> {
    const template = this.renderPasswordResetEmail(input);
    const webhookUrl = process.env.PASSWORD_RESET_EMAIL_WEBHOOK_URL;
    if (webhookUrl) {
      const response = await fetch(webhookUrl, {
        body: JSON.stringify({
          html: template.html,
          subject: template.subject,
          text: template.text,
          to: input.email,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Password reset email delivery failed');
      }
    }

    this.logger.log({
      deliveryMode: webhookUrl ? 'webhook' : 'log-only',
      event: 'PasswordResetEmailQueued',
      expiresAt: input.expiresAt.toISOString(),
      subject: template.subject,
      to: input.email,
    });
  }

  renderPasswordResetEmail(input: PasswordResetEmailInput): {
    html: string;
    subject: string;
    text: string;
  } {
    const expiration = input.expiresAt.toISOString();
    const subject = 'Reset your PM Platform password';
    const text = [
      'A password reset was requested for your PM Platform account.',
      `Use this secure link to reset your password: ${input.resetUrl}`,
      `This link expires at ${expiration}.`,
      'If you did not request this reset, ignore this email. Your password will not change.',
    ].join('\n\n');
    const html = `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
        <h1 style="font-size: 20px;">Reset your PM Platform password</h1>
        <p>A password reset was requested for your PM Platform account.</p>
        <p>
          <a href="${input.resetUrl}" style="background: #0f766e; color: #ffffff; padding: 10px 14px; text-decoration: none; border-radius: 4px;">
            Reset password
          </a>
        </p>
        <p>This secure link expires at ${expiration}.</p>
        <p>If you did not request this reset, ignore this email. Your password will not change.</p>
      </div>
    `;

    return { html, subject, text };
  }
}
