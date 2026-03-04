import { Resend } from 'resend';

export async function sendVerificationCode(email: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: 'CityTracker <onboarding@resend.dev>',
    to: email,
    subject: `${code} — Code de verification CityTracker`,
    html: `
      <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 24px;">
        <h2 style="margin: 0 0 16px;">Bienvenue sur CityTracker</h2>
        <p>Votre code de verification :</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 16px; background: #f5f5f5; border-radius: 8px; margin: 16px 0;">
          ${code}
        </div>
        <p style="color: #666; font-size: 14px;">Ce code expire dans 10 minutes.</p>
      </div>
    `,
  });
}
