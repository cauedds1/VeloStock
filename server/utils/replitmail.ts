import sgMail from '@sendgrid/mail';
import { z } from 'zod';

export const zSmtpMessage = z.object({
  to: z
    .union([z.string().email(), z.array(z.string().email())])
    .describe("Recipient email address(es)"),
  cc: z
    .union([z.string().email(), z.array(z.string().email())])
    .optional()
    .describe("CC recipient email address(es)"),
  subject: z.string().describe("Email subject"),
  text: z.string().optional().describe("Plain text body"),
  html: z.string().optional().describe("HTML body"),
});

export type SmtpMessage = z.infer<typeof zSmtpMessage>;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  const response = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=sendgrid',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  );
  
  const data = await response.json();
  const connectionSettings = data.items?.[0];

  if (!connectionSettings || !connectionSettings.settings.api_key || !connectionSettings.settings.from_email) {
    throw new Error('SendGrid not connected');
  }
  
  return { 
    apiKey: connectionSettings.settings.api_key, 
    email: connectionSettings.settings.from_email 
  };
}

export async function sendEmail(message: SmtpMessage) {
  try {
    console.log("[SendGrid] Enviando email para:", message.to);

    const { apiKey, email } = await getCredentials();
    sgMail.setApiKey(apiKey);

    const msg: any = {
      to: message.to,
      from: email,
      subject: message.subject,
    };

    if (message.html) {
      msg.html = message.html;
    }
    
    if (message.text) {
      msg.text = message.text;
    }

    if (!message.html && !message.text) {
      msg.text = 'Email';
    }

    if (message.cc) {
      msg.cc = message.cc;
    }

    const result = await sgMail.send(msg);
    
    console.log("[SendGrid] Email enviado com sucesso!");
    
    const toArray = Array.isArray(message.to) ? message.to : [message.to];
    return {
      accepted: toArray,
      rejected: [],
      messageId: `sg-${Date.now()}`,
      response: 'Email sent successfully'
    };
  } catch (error) {
    console.error("[SendGrid] Erro ao enviar email:", error);
    throw error;
  }
}
