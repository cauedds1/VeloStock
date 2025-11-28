// Resend integration for sending transactional emails
import { Resend } from 'resend';
import { z } from 'zod';

export const zSmtpMessage = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]).describe("Recipient email address(es)"),
  cc: z.union([z.string().email(), z.array(z.string().email())]).optional().describe("CC recipient email address(es)"),
  subject: z.string().describe("Email subject"),
  text: z.string().optional().describe("Plain text body"),
  html: z.string().optional().describe("HTML body"),
});

export type SmtpMessage = z.infer<typeof zSmtpMessage>;

let connectionSettings: any;

async function getCredentials() {
  try {
    const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME || 'connectors.replit.com';
    
    const xReplitToken = process.env.REPL_IDENTITY
      ? 'repl ' + process.env.REPL_IDENTITY
      : process.env.WEB_REPL_RENEWAL
        ? 'depl ' + process.env.WEB_REPL_RENEWAL
        : null;

    if (xReplitToken) {
      console.log("[Resend] Tentando via Replit Connectors...");
      
      const response = await fetch(
        `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=resend`,
        {
          headers: {
            'Accept': 'application/json',
            'X_REPLIT_TOKEN': xReplitToken
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        connectionSettings = data.items?.[0];
        
        if (connectionSettings?.settings?.api_key) {
          console.log("[Resend] ✓ Credenciais obtidas via Replit Connectors");
          return {
            apiKey: connectionSettings.settings.api_key,
            fromEmail: connectionSettings.settings.from_email || 'onboarding@resend.dev'
          };
        }
      }
    }

    // Fallback: tentar env vars
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    if (apiKey) {
      console.log("[Resend] ✓ Credenciais obtidas via Environment Variables");
      return { apiKey, fromEmail };
    }

    throw new Error('Resend credentials not found');
  } catch (error) {
    console.error("[Resend] Erro ao obter credenciais:", error);
    throw error;
  }
}

export async function sendEmail(message: SmtpMessage) {
  try {
    const to = Array.isArray(message.to) ? message.to : [message.to];
    
    console.log("\n" + "=".repeat(60));
    console.log("📧 ENVIANDO EMAIL DE VERIFICAÇÃO");
    console.log("=".repeat(60));
    console.log("Para:", to.join(', '));
    console.log("Assunto:", message.subject);

    const { apiKey, fromEmail } = await getCredentials();

    console.log("[Resend] Configurando cliente Resend...");
    const resend = new Resend(apiKey);

    console.log("[Resend] Enviando via Resend...");
    
    const emailOptions: any = {
      from: fromEmail,
      to: to,
      subject: message.subject,
    };
    
    if (message.html) emailOptions.html = message.html;
    if (message.text) emailOptions.text = message.text;
    
    const { data, error } = await resend.emails.send(emailOptions);

    if (error) {
      throw error;
    }

    console.log("[Resend] ✓ Email enviado com sucesso!");
    
    // Extrair código do HTML para log
    const codeMatch = message.html?.match(/class="code">(\d{6})</);
    if (codeMatch) {
      console.log("🔑 Código:", codeMatch[1]);
    }
    
    console.log("=".repeat(60) + "\n");

    return {
      accepted: to,
      rejected: [],
      messageId: data?.id || `resend-${Date.now()}`,
      response: 'Email sent successfully'
    };
  } catch (error) {
    console.error("\n[Resend] ❌ ERRO ao enviar email:", error);
    console.log("=".repeat(60) + "\n");
    throw error;
  }
}
