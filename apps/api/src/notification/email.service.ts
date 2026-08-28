import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  private getFromAddress(): string {
    return process.env.EMAIL_FROM || 'ForgeTrack <noreply@forgetrack.dev>';
  }

  private async sendRawEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
    const resendKey = process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY;
    const sendgridKey = process.env.SENDGRID_API_KEY;

    if (resendKey) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: this.getFromAddress(),
            to: [to],
            subject,
            html,
            text,
          }),
        });

        if (response.ok) {
          this.logger.log(`[Resend] Email sent to ${to}: "${subject}"`);
          return true;
        } else {
          const errData = await response.json();
          this.logger.warn(`[Resend Error] Failed to send email to ${to}:`, errData);
        }
      } catch (err) {
        this.logger.error(`[Resend Exception] Error sending email to ${to}:`, err);
      }
    } else if (sendgridKey) {
      try {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sendgridKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: { email: this.getFromAddress() },
            subject,
            content: [
              { type: 'text/plain', value: text },
              { type: 'text/html', value: html },
            ],
          }),
        });

        if (response.ok) {
          this.logger.log(`[SendGrid] Email sent to ${to}: "${subject}"`);
          return true;
        }
      } catch (err) {
        this.logger.error(`[SendGrid Exception] Error sending email to ${to}:`, err);
      }
    }

    // Local / Dev Fallback: structured console logger
    this.logger.log(`[Email Service (Dev Mode)] 📨 To: ${to} | Subject: "${subject}" | Content: ${text.substring(0, 120)}...`);
    return true;
  }

  async sendInvitation(
    toEmail: string,
    inviterName: string,
    workspaceName: string,
    inviteLink: string,
  ): Promise<boolean> {
    const subject = `${inviterName} invited you to join ${workspaceName} on ForgeTrack`;
    const text = `Hi,\n\n${inviterName} has invited you to collaborate on ${workspaceName} on ForgeTrack.\n\nAccept your invitation here:\n${inviteLink}\n\nHappy engineering,\nThe ForgeTrack Team`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e7e2d6; border-radius: 16px; background-color: #fbf9f5;">
        <div style="margin-bottom: 20px; font-weight: 800; font-size: 20px; color: #1c1917;">ForgeTrack 🐛</div>
        <h2 style="font-size: 18px; color: #1c1917; margin-bottom: 12px;">You've been invited to ${workspaceName}</h2>
        <p style="font-size: 14px; color: #78716c; line-height: 1.5;">${inviterName} has invited you to collaborate on high-velocity defect tracking and releases.</p>
        <div style="margin: 24px 0;">
          <a href="${inviteLink}" style="background-color: #ccee22; color: #1c1917; padding: 12px 24px; font-weight: 700; font-size: 13px; text-decoration: none; border-radius: 12px; display: inline-block;">Accept Invitation</a>
        </div>
        <p style="font-size: 12px; color: #a8a29e;">If the button doesn't work, copy and paste this link in your browser:<br/><a href="${inviteLink}" style="color: #3b82f6;">${inviteLink}</a></p>
      </div>
    `;

    return this.sendRawEmail(toEmail, subject, html, text);
  }

  async sendPasswordReset(toEmail: string, resetLink: string): Promise<boolean> {
    const subject = `Reset your ForgeTrack password`;
    const text = `Hi,\n\nWe received a request to reset your ForgeTrack password. Click the link below to set a new password:\n\n${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you did not request this, please ignore this email.`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e7e2d6; border-radius: 16px; background-color: #fbf9f5;">
        <div style="margin-bottom: 20px; font-weight: 800; font-size: 20px; color: #1c1917;">ForgeTrack 🐛</div>
        <h2 style="font-size: 18px; color: #1c1917; margin-bottom: 12px;">Password Reset Request</h2>
        <p style="font-size: 14px; color: #78716c; line-height: 1.5;">Click below to reset your password. This link expires in 1 hour.</p>
        <div style="margin: 24px 0;">
          <a href="${resetLink}" style="background-color: #ccee22; color: #1c1917; padding: 12px 24px; font-weight: 700; font-size: 13px; text-decoration: none; border-radius: 12px; display: inline-block;">Reset Password</a>
        </div>
        <p style="font-size: 12px; color: #a8a29e;">Link: <a href="${resetLink}" style="color: #3b82f6;">${resetLink}</a></p>
      </div>
    `;

    return this.sendRawEmail(toEmail, subject, html, text);
  }

  async sendVerificationEmail(toEmail: string, verifyLink: string): Promise<boolean> {
    const subject = `Verify your ForgeTrack email address`;
    const text = `Hi,\n\nPlease verify your email address for ForgeTrack by clicking the link below:\n\n${verifyLink}\n\nHappy tracking!`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e7e2d6; border-radius: 16px; background-color: #fbf9f5;">
        <div style="margin-bottom: 20px; font-weight: 800; font-size: 20px; color: #1c1917;">ForgeTrack 🐛</div>
        <h2 style="font-size: 18px; color: #1c1917; margin-bottom: 12px;">Verify your email</h2>
        <p style="font-size: 14px; color: #78716c; line-height: 1.5;">Confirm your email address to complete your registration.</p>
        <div style="margin: 24px 0;">
          <a href="${verifyLink}" style="background-color: #ccee22; color: #1c1917; padding: 12px 24px; font-weight: 700; font-size: 13px; text-decoration: none; border-radius: 12px; display: inline-block;">Verify Email</a>
        </div>
      </div>
    `;

    return this.sendRawEmail(toEmail, subject, html, text);
  }

  async sendIssueAssigned(
    toEmail: string,
    issueKey: string,
    issueTitle: string,
    projectName: string,
  ): Promise<boolean> {
    const subject = `[${issueKey}] Assigned to you: ${issueTitle}`;
    const text = `Hi,\n\nYou have been assigned to issue ${issueKey} ("${issueTitle}") in project ${projectName}.\n\nCheck ForgeTrack for details.`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e7e2d6; border-radius: 16px; background-color: #fbf9f5;">
        <div style="margin-bottom: 20px; font-weight: 800; font-size: 20px; color: #1c1917;">ForgeTrack 🐛</div>
        <h2 style="font-size: 18px; color: #1c1917; margin-bottom: 12px;">Issue Assigned: ${issueKey}</h2>
        <p style="font-size: 14px; color: #1c1917; font-weight: 600;">${issueTitle}</p>
        <p style="font-size: 12px; color: #78716c;">Project: ${projectName}</p>
      </div>
    `;

    return this.sendRawEmail(toEmail, subject, html, text);
  }
}
