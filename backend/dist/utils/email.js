"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmailVerification = exports.sendWelcomeEmail = exports.sendPasswordResetEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
const sendPasswordResetEmail = async (to, resetToken) => {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    console.log(`[Email] Enviando email de recuperação de senha para: ${to}`);
    await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject: 'ChefWell - Recuperação de Senha',
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 30px; background: #059669; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">🍽️ ChefWell App</h1>
            <p style="margin: 10px 0 0 0;">Sistema de Gestão para Restaurantes</p>
          </div>
          <div class="content">
            <h2>Recuperação de Senha</h2>
            <p>Olá,</p>
            <p>Você solicitou a recuperação de senha da sua conta no <strong>ChefWell App</strong>.</p>
            <p>Clique no botão abaixo para criar uma nova senha:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Redefinir Senha</a>
            </p>
            <p style="font-size: 14px; color: #666;">Ou copie e cole este link no seu navegador:</p>
            <p style="font-size: 12px; word-break: break-all; background: white; padding: 10px; border-radius: 4px;">${resetUrl}</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="color: #d97706; font-weight: bold;">⚠️ Importante:</p>
            <ul style="color: #666;">
              <li>Este link expira em <strong>1 hora</strong></li>
              <li>Se você não solicitou esta recuperação, ignore este email</li>
              <li>Sua senha atual permanecerá ativa até que você a altere</li>
            </ul>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} ChefWell App - Todos os direitos reservados</p>
            <p>Este é um email automático, por favor não responda.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    });
    console.log(`[Email] Email de recuperação de senha enviado com sucesso para: ${to}`);
};
exports.sendPasswordResetEmail = sendPasswordResetEmail;
const sendWelcomeEmail = async (to, name) => {
    console.log(`[Email] Enviando email de boas-vindas para: ${to}`);
    await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject: 'ChefWell - Bem-vindo ao Sistema!',
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 30px; background: #059669; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">🍽️ ChefWell App</h1>
            <p style="margin: 10px 0 0 0;">Sistema de Gestão para Restaurantes</p>
          </div>
          <div class="content">
            <h2>Bem-vindo, ${name}!</h2>
            <p>Sua conta foi criada com sucesso no <strong>ChefWell App</strong>!</p>
            <p>Agora você tem acesso a todas as funcionalidades do sistema de gestão para restaurantes.</p>
            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}" class="button">Acessar Sistema</a>
            </p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p><strong>Próximos Passos:</strong></p>
            <ul>
              <li>Configure seu perfil e permissões</li>
              <li>Explore as funcionalidades do PDV</li>
              <li>Cadastre produtos e categorias</li>
              <li>Comece a gerenciar seus pedidos</li>
            </ul>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} ChefWell App - Todos os direitos reservados</p>
            <p>Este é um email automático, por favor não responda.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    });
    console.log(`[Email] Email de boas-vindas enviado com sucesso para: ${to}`);
};
exports.sendWelcomeEmail = sendWelcomeEmail;
const sendEmailVerification = async (to, name, verificationToken) => {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    console.log(`[Email] Enviando email de confirmação para: ${to}`);
    await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject: 'ChefWell - Confirme seu Email',
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 30px; background: #059669; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">🍽️ ChefWell App</h1>
            <p style="margin: 10px 0 0 0;">Sistema de Gestão para Restaurantes</p>
          </div>
          <div class="content">
            <h2>Bem-vindo, ${name}!</h2>
            <p>Obrigado por se cadastrar no <strong>ChefWell App</strong>!</p>
            <p>Para começar a usar o sistema, você precisa confirmar seu endereço de email.</p>
            <p>Clique no botão abaixo para confirmar:</p>
            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button">Confirmar Email</a>
            </p>
            <p style="font-size: 14px; color: #666;">Ou copie e cole este link no seu navegador:</p>
            <p style="font-size: 12px; word-break: break-all; background: white; padding: 10px; border-radius: 4px;">${verificationUrl}</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="color: #d97706; font-weight: bold;">⚠️ Importante:</p>
            <ul style="color: #666;">
              <li>Este link expira em <strong>24 horas</strong></li>
              <li>Você não poderá fazer login até confirmar seu email</li>
              <li>Se você não se cadastrou, ignore este email</li>
            </ul>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} ChefWell App - Todos os direitos reservados</p>
            <p>Este é um email automático, por favor não responda.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    });
    console.log(`[Email] Email de confirmação enviado com sucesso para: ${to}`);
};
exports.sendEmailVerification = sendEmailVerification;
//# sourceMappingURL=email.js.map