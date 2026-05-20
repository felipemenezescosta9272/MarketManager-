import nodemailer from 'nodemailer';

export const sendEmail = async (to: string, subject: string, html: string) => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || 'no-reply@supermarket-pos.com';

  if (!host || !user || !pass) {
    console.warn(`[Email Service] SMTP not configured. Logging email to console:
To: ${to}
Subject: ${subject}
Content: ${html.substring(0, 100)}...`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { 
      user, 
      pass 
    },
  });

  try {
    await transporter.sendMail({ 
      from, 
      to, 
      subject, 
      html 
    });
    console.log(`[Email Service] Email sent to ${to}`);
  } catch (error: any) {
    if (error.message?.includes('Application-specific password required')) {
      console.error(`[Email Service] CRITICAL: O provedor de e-mail exige uma "Senha de App". 
        Para corrigir:
        1. Vá nas configurações da sua conta Google (ou provedor SMTP).
        2. Ative a Verificação em Duas Etapas.
        3. Procure por "Senhas de App".
        4. Gere uma nova senha para "E-mail" e use-a no campo SMTP_PASS nas configurações do AI Studio.`);
    } else {
      console.error(`[Email Service] Error sending email to ${to}:`, error);
    }
    
    // Don't throw in dev if not configured, but in production we might want to
    if (process.env.NODE_ENV === 'production') throw error;
  }
};

export const sendConfirmationEmail = async (to: string, name: string) => {
  const subject = 'Confirmação de Conta - Market Manager';
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #d97706;">Bem-vindo ao Market Manager, ${name}!</h2>
      <p>Sua conta foi criada com sucesso pelo administrador.</p>
      <p>Para começar a usar o sistema, por favor confirme seu e-mail clicando no botão abaixo:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.APP_URL}/api/auth/confirm-email?email=${encodeURIComponent(to)}" 
           style="background-color: #d97706; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          Confirmar E-mail
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">Se o botão não funcionar, copie e cole o link abaixo no seu navegador:</p>
      <p style="color: #666; font-size: 12px; word-break: break-all;">${process.env.APP_URL}/api/auth/confirm-email?email=${encodeURIComponent(to)}</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="font-size: 12px; color: #999;">Esta é uma mensagem automática, por favor não responda.</p>
    </div>
  `;
  await sendEmail(to, subject, html);
};

export const sendPasswordChangedEmail = async (to: string, name: string) => {
  const subject = 'Senha Alterada - Market Manager';
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #d97706;">Olá, ${name}!</h2>
      <p>Informamos que a senha da sua conta no <strong>Market Manager</strong> foi alterada recentemente.</p>
      <p>Se você realizou esta alteração, pode ignorar este e-mail.</p>
      <p style="color: #e11d48; font-weight: bold;">Se você NÃO solicitou esta alteração, por favor entre em contato com o suporte imediatamente ou use a função de recuperação de senha na tela de login.</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="font-size: 12px; color: #999;">Esta é uma mensagem automática, por favor não responda.</p>
    </div>
  `;
  await sendEmail(to, subject, html);
};

export const sendPasswordResetEmail = async (to: string, token: string) => {
  const subject = 'Recuperação de Senha - Market Manager';
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #d97706;">Recuperação de Senha</h2>
      <p>Você solicitou a recuperação de sua senha no Market Manager.</p>
      <p>Use o código abaixo para redefinir sua senha:</p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #d97706; background: #fff7ed; padding: 10px 20px; border-radius: 5px; border: 1px dashed #d97706;">
          ${token}
        </span>
      </div>
      <p>Este código expira em 1 hora.</p>
      <p style="color: #666; font-size: 14px;">Se você não solicitou esta alteração, por favor ignore este e-mail.</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="font-size: 12px; color: #999;">Esta é uma mensagem automática, por favor não responda.</p>
    </div>
  `;
  await sendEmail(to, subject, html);
};
