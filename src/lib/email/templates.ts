import { escapeHtml } from "@/lib/security/text";
import { SITE } from "@/constants/site";

export interface EmailTemplateInput {
  heading: string;
  paragraphs: string[];
  action?: { label: string; url: string };
  /** Short note shown under the action, such as an expiry window. */
  footnote?: string;
}

export interface RenderedEmail {
  text: string;
  html: string;
}

/**
 * Builds the plain-text and HTML bodies for a transactional message. Every dynamic value is escaped
 * for HTML, and links are only ever the URLs supplied by application code.
 */
export function renderEmail(input: EmailTemplateInput): RenderedEmail {
  const textParts = [input.heading, ...input.paragraphs];
  if (input.action) {
    textParts.push(`${input.action.label}: ${input.action.url}`);
  }
  if (input.footnote) {
    textParts.push(input.footnote);
  }
  textParts.push(`${SITE.name} · ${SITE.governanceLabel}`);

  const paragraphHtml = input.paragraphs
    .map((paragraph) => `<p style="margin:0 0 16px;line-height:1.6;">${escapeHtml(paragraph)}</p>`)
    .join("");

  const actionHtml = input.action
    ? `<p style="margin:24px 0;"><a href="${escapeHtml(input.action.url)}" style="background:#123E35;color:#ffffff;padding:12px 20px;border-radius:12px;text-decoration:none;display:inline-block;">${escapeHtml(input.action.label)}</a></p>`
    : "";

  const footnoteHtml = input.footnote
    ? `<p style="margin:0 0 16px;color:#5E6D66;font-size:14px;">${escapeHtml(input.footnote)}</p>`
    : "";

  const html = `<!doctype html><html lang="en"><body style="margin:0;background:#F8F6EF;font-family:Arial,Helvetica,sans-serif;color:#182A25;"><div style="max-width:560px;margin:0 auto;padding:32px 20px;"><h1 style="font-family:Georgia,serif;font-size:26px;margin:0 0 20px;color:#123E35;">${escapeHtml(input.heading)}</h1>${paragraphHtml}${actionHtml}${footnoteHtml}<hr style="border:none;border-top:1px solid #DFE5DC;margin:28px 0 16px;"><p style="margin:0;color:#5E6D66;font-size:13px;">${escapeHtml(SITE.name)} · ${escapeHtml(SITE.governanceLabel)}</p></div></body></html>`;

  return { text: textParts.join("\n\n"), html };
}
