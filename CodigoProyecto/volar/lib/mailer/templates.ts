import { buildBody, buildSubject } from "@/features/flights/contingency";
import type { FlightChangeType } from "@/generated/prisma/enums";

export type ContingencyActionLink = {
  accessToken: string;
  url: string;
};

export function buildContingencyEmailContent(
  type: FlightChangeType,
  flightCode: string,
  previousDepartureAt: Date,
  previousArrivalAt: Date,
  newDepartureAt: Date | null,
  newArrivalAt: Date | null,
  actionLinks: ContingencyActionLink[],
) {
  const subject = buildSubject(type, flightCode);
  const textBody = buildBody(
    type,
    flightCode,
    previousDepartureAt,
    previousArrivalAt,
    newDepartureAt,
    newArrivalAt,
  );

  const linksText =
    actionLinks.length > 0
      ? "\n\nPara elegir reprogramación o reembolso, accedé a:\n" +
        actionLinks.map((link) => `- ${link.url}`).join("\n")
      : "";

  const text = textBody + linksText;

  const linksHtml =
    actionLinks.length > 0
      ? `<p>Para elegir reprogramación o reembolso, accedé a:</p><ul>` +
        actionLinks
          .map(
            (link) =>
              `<li><a href="${link.url}">Gestionar pasaje (${link.accessToken.slice(0, 8)}…)</a></li>`,
          )
          .join("") +
        `</ul>`
      : "";

  const html = `<p>${textBody.replace(/\n/g, "<br>")}</p>${linksHtml}`;

  return { subject, text, html };
}
