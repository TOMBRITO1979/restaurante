import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendPasswordResetEmail = async (
  to: string,
  resetToken: string
): Promise<void> => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: 'Recuperação de Senha',
    html: `
      <h2>Recuperação de Senha</h2>
      <p>Você solicitou a recuperação de senha.</p>
      <p>Clique no link abaixo para redefinir sua senha:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>Este link expira em 1 hora.</p>
      <p>Se você não solicitou esta recuperação, ignore este email.</p>
    `,
  });
};

export const sendWelcomeEmail = async (to: string, name: string): Promise<void> => {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: 'Bem-vindo ao Sistema de Restaurantes',
    html: `
      <h2>Bem-vindo, ${name}!</h2>
      <p>Sua conta foi criada com sucesso.</p>
      <p>Acesse o sistema em: <a href="${process.env.FRONTEND_URL}">${process.env.FRONTEND_URL}</a></p>
    `,
  });
};
