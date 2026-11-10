import "server-only";

import { getMonitorConfig } from "@/lib/monitor";

/**
 * Notification des nouvelles demandes de contact.
 *
 * Fonctionne sans aucun disque persistant :
 * - Webhook dédié `CONTACT_WEBHOOK_URL` ou repli automatique sur le Webhook Discord
 *   configuré dans `/dashboard` (`DISCORD_WEBHOOK_URL` / `monitorConfig`) afin
 *   qu'aucun message client ne soit jamais perdu lors d'un redéploiement Render.
 * - E-mail optionnel via l'API Resend (`RESEND_API_KEY` + `CONTACT_NOTIFY_EMAIL`).
 */

export interface LeadNotification {
  name: string;
  email: string;
  company: string | null;
  subject: string;
  budget: string | null;
  message: string;
  createdAt: Date;
}

const SUBJECT_LABELS: Record<string, string> = {
  web: "Création de site web",
  security: "Cybersécurité / audit",
  both: "Site + sécurité",
};

function renderText(lead: LeadNotification): string {
  const receivedAt =
    lead.createdAt instanceof Date
      ? lead.createdAt
      : new Date(lead.createdAt ?? Date.now());
  return [
    `Nouvelle demande — ${SUBJECT_LABELS[lead.subject] ?? lead.subject}`,
    "",
    `Nom : ${lead.name}`,
    `Email : ${lead.email}`,
    `Entreprise : ${lead.company ?? "—"}`,
    `Budget : ${lead.budget ?? "—"}`,
    `Reçue le : ${receivedAt.toISOString()}`,
    "",
    "Message :",
    lead.message,
  ].join("\n");
}

export async function notifyLead(lead: LeadNotification): Promise<void> {
  const to = process.env.CONTACT_NOTIFY_EMAIL?.trim();
  const apiKey = process.env.RESEND_API_KEY?.trim();

  let webhook = process.env.CONTACT_WEBHOOK_URL?.trim() || "";
  if (!webhook) {
    try {
      const monitorCfg = await getMonitorConfig();
      webhook = monitorCfg.discordWebhookUrl.trim();
    } catch {
      webhook = (process.env.DISCORD_WEBHOOK_URL ?? "").trim();
    }
  }

  if (!to && !webhook) {
    console.warn(
      "[contact] aucune notification externe configurée — la demande n'est conservée qu'en base (persistante uniquement avec Turso)."
    );
    return;
  }

  const text = renderText(lead);
  const receivedAt =
    lead.createdAt instanceof Date
      ? lead.createdAt
      : new Date(lead.createdAt ?? Date.now());

  if (webhook) {
    try {
      const isDiscord = /discord(?:app)?\.com\/api\/webhooks\//i.test(webhook);
      const body = isDiscord
        ? {
            username: "4UR Leads",
            embeds: [
              {
                title: `📩 Nouvelle demande — ${SUBJECT_LABELS[lead.subject] ?? lead.subject}`,
                color: 0xfafafa,
                fields: [
                  { name: "Nom", value: lead.name, inline: true },
                  { name: "Email", value: lead.email, inline: true },
                  {
                    name: "Entreprise",
                    value: lead.company?.trim() || "—",
                    inline: true,
                  },
                  {
                    name: "Budget",
                    value: lead.budget?.trim() || "Non précisé",
                    inline: true,
                  },
                  {
                    name: "Message",
                    value: lead.message.slice(0, 1020),
                    inline: false,
                  },
                ],
                timestamp: receivedAt.toISOString(),
              },
            ],
          }
        : { content: text, text, lead };

      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (err) {
      console.error("[contact] envoi du webhook impossible:", err);
    }
  }

  if (apiKey && to) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.CONTACT_FROM_EMAIL?.trim() || "4ur <onboarding@resend.dev>",
          to: [to],
          subject: `[4ur] Nouvelle demande — ${lead.name}`,
          text,
          reply_to: lead.email,
        }),
      });
      if (!res.ok) {
        console.error("[contact] Resend a répondu", res.status, await res.text());
      }
    } catch (err) {
      console.error("[contact] envoi de l'email impossible:", err);
    }
  }
}
