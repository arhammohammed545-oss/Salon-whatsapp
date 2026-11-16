type TemplateParameter = { type: "text"; text: string };

type SendTemplateInput = {
  to: string;
  templateName: string;
  languageCode: string;
  bodyParameters?: string[];
};

export async function sendWhatsAppTemplate(input: SendTemplateInput) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const apiVersion = process.env.WHATSAPP_API_VERSION;

  if (!phoneNumberId || !accessToken || !apiVersion || apiVersion.includes("X")) {
    throw new Error("WhatsApp Cloud API environment is not configured.");
  }

  if (!/^\+[1-9]\d{7,14}$/.test(input.to)) {
    throw new Error("Recipient must be a valid E.164 phone number.");
  }

  const parameters: TemplateParameter[] = (input.bodyParameters ?? []).map((text) => ({
    type: "text",
    text
  }));

  const response = await fetch(
    `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: input.to.replace("+", ""),
        type: "template",
        template: {
          name: input.templateName,
          language: { code: input.languageCode },
          ...(parameters.length > 0
            ? { components: [{ type: "body", parameters }] }
            : {})
        }
      }),
      cache: "no-store"
    }
  );

  const result: unknown = await response.json();
  if (!response.ok) {
    throw new Error(`WhatsApp API request failed with status ${response.status}.`);
  }

  return result;
}
