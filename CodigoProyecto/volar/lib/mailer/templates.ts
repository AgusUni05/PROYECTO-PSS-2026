import { buildSubject } from "@/features/flights/contingency";
import type { FlightChangeType } from "@/generated/prisma/enums";

export type ContingencyActionLink = {
  accessToken: string;
  url: string;
};

export type ContingencyAirport = {
  code: string;
  city: string;
};

const BUENOS_AIRES_TIMEZONE = "America/Argentina/Buenos_Aires";

const CONTINGENCY_DATE_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: BUENOS_AIRES_TIMEZONE,
});

const CONTINGENCY_ONLY_DATE_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: BUENOS_AIRES_TIMEZONE,
});

const SLOGAN = "Volá por Argentina con VolAR.";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatContingencyDateTime(date: Date): string {
  return CONTINGENCY_DATE_FORMATTER.format(date);
}

function formatContingencyDate(date: Date): string {
  return CONTINGENCY_ONLY_DATE_FORMATTER.format(date);
}

function formatSeatClass(seatClass: string): string {
  if (seatClass === "FIRST") return "Primera clase";
  return "Economy";
}

function buildContingencyEmailText(
  type: FlightChangeType,
  flightCode: string,
  origin: ContingencyAirport,
  destination: ContingencyAirport,
  seatClass: string,
  previousDepartureAt: Date,
  previousArrivalAt: Date,
  newDepartureAt: Date | null,
  newArrivalAt: Date | null,
  actionLinks: ContingencyActionLink[],
  isCounterSale: boolean,
): string {
  const routeLabel = `${origin.city} (${origin.code}) → ${destination.city} (${destination.code})`;
  const classLabel = formatSeatClass(seatClass);

  const lines: string[] = [SLOGAN, ""];

  if (type === "SCHEDULE_CHANGE" && newDepartureAt && newArrivalAt) {
    lines.push(
      `Te informamos que el vuelo ${routeLabel} cambió de horario.`,
      "",
      `Horario anterior: ${formatContingencyDateTime(previousDepartureAt)} - ${formatContingencyDateTime(previousArrivalAt)}`,
      `Nuevo horario: ${formatContingencyDateTime(newDepartureAt)} - ${formatContingencyDateTime(newArrivalAt)}`,
      "",
      `Clase: ${classLabel}`,
      `Código de vuelo: ${flightCode}`,
    );
  } else {
    lines.push(
      `Lamentamos informarte que el vuelo ${routeLabel} del ${formatContingencyDate(previousDepartureAt)} fue cancelado.`,
      "",
      `Clase: ${classLabel}`,
      `Código de vuelo: ${flightCode}`,
    );
  }

  if (isCounterSale) {
    lines.push(
      "",
      "Esta compra fue registrada en mostrador. Para reembolsar o reprogramar, iniciá sesión en VolAR con el mismo correo en que recibiste este aviso.",
    );
  }

  if (actionLinks.length > 0) {
    lines.push("", "Para elegir reprogramación o reembolso, accedé a:");
    actionLinks.forEach((link) => lines.push(link.url));
  }

  return lines.join("\n");
}

function buildContingencyEmailHtml(
  type: FlightChangeType,
  flightCode: string,
  origin: ContingencyAirport,
  destination: ContingencyAirport,
  seatClass: string,
  previousDepartureAt: Date,
  previousArrivalAt: Date,
  newDepartureAt: Date | null,
  newArrivalAt: Date | null,
  actionLinks: ContingencyActionLink[],
  isCounterSale: boolean,
): string {
  const routeLabel = `${origin.city} (${origin.code}) → ${destination.city} (${destination.code})`;
  const classLabel = formatSeatClass(seatClass);

  const primaryColor = "#5530E0";
  const darkColor = "#16133D";
  const lightColor = "#F1EDFF";
  const whiteColor = "#FFFFFF";
  const mutedColor = "#6B7280";
  const borderColor = "#E5E7EB";

  const mainHeadline =
    type === "SCHEDULE_CHANGE" && newDepartureAt && newArrivalAt
      ? "Cambio de horario en tu vuelo"
      : "Tu vuelo fue cancelado";

  const detailsRows =
    type === "SCHEDULE_CHANGE" && newDepartureAt && newArrivalAt
      ? [
          scheduleRow("Horario anterior", formatContingencyDateTime(previousDepartureAt), formatContingencyDateTime(previousArrivalAt)),
          scheduleRow("Nuevo horario", formatContingencyDateTime(newDepartureAt), formatContingencyDateTime(newArrivalAt)),
        ]
      : [
          `<tr>
            <td style="padding:12px 0;border-bottom:1px solid ${borderColor};color:${darkColor};font-size:16px;line-height:1.5;">
              Fecha del vuelo<br />
              <span style="font-weight:700;">${escapeHtml(formatContingencyDate(previousDepartureAt))}</span>
            </td>
          </tr>`,
        ];

  const counterNote = isCounterSale
    ? `<tr>
        <td style="padding:16px;background:${lightColor};border-radius:8px;color:${darkColor};font-size:14px;line-height:1.5;">
          <strong>Compra registrada en mostrador</strong><br />
          Para reembolsar o reprogramar, iniciá sesión en VolAR con el mismo correo en que recibiste este aviso.
        </td>
      </tr>`
    : "";

  const linksHtml = actionLinks
    .map(
      (link) =>
        `<tr>
          <td style="padding:8px 0;">
            <a href="${escapeHtml(link.url)}" style="display:inline-block;padding:14px 24px;background:${primaryColor};color:${whiteColor};text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Gestionar pasaje</a>
          </td>
        </tr>`,
    )
    .join("");

  const linksBlock = actionLinks.length
    ? `<tr>
        <td style="padding-top:24px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            ${linksHtml}
          </table>
        </td>
      </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(buildSubject(type, flightCode))}</title>
</head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F9FAFB;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:${whiteColor};border-radius:12px;overflow:hidden;border:1px solid ${borderColor};">
          <tr>
            <td style="padding:24px 24px 16px;background:${primaryColor};color:${whiteColor};text-align:center;">
              <div style="font-size:22px;font-weight:800;letter-spacing:-0.5px;">VolAR</div>
              <div style="margin-top:4px;font-size:13px;opacity:0.95;">${escapeHtml(SLOGAN)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="font-size:20px;font-weight:700;color:${darkColor};line-height:1.3;">
                    ${escapeHtml(mainHeadline)}
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:8px;font-size:16px;color:${mutedColor};line-height:1.5;">
                    ${escapeHtml(routeLabel)}
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:16px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#FAFAFA;border-radius:8px;">
                      ${detailsRows.join("")}
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid ${borderColor};color:${darkColor};font-size:16px;line-height:1.5;">
                          Clase<br />
                          <span style="font-weight:700;">${escapeHtml(classLabel)}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0;color:${darkColor};font-size:16px;line-height:1.5;">
                          Código de vuelo<br />
                          <span style="font-weight:700;">${escapeHtml(flightCode)}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ${counterNote}
                ${linksBlock}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function scheduleRow(label: string, departure: string, arrival: string): string {
  const darkColor = "#16133D";
  const borderColor = "#E5E7EB";
  return `<tr>
    <td style="padding:12px 0;border-bottom:1px solid ${borderColor};color:${darkColor};font-size:16px;line-height:1.5;">
      ${escapeHtml(label)}<br />
      <span style="font-weight:700;">${escapeHtml(departure)}</span> → <span style="font-weight:700;">${escapeHtml(arrival)}</span>
    </td>
  </tr>`;
}

export function buildContingencyEmailContent(
  type: FlightChangeType,
  flightCode: string,
  origin: ContingencyAirport,
  destination: ContingencyAirport,
  seatClass: string,
  previousDepartureAt: Date,
  previousArrivalAt: Date,
  newDepartureAt: Date | null,
  newArrivalAt: Date | null,
  actionLinks: ContingencyActionLink[],
  isCounterSale: boolean,
) {
  const subject = buildSubject(type, flightCode);
  const text = buildContingencyEmailText(
    type,
    flightCode,
    origin,
    destination,
    seatClass,
    previousDepartureAt,
    previousArrivalAt,
    newDepartureAt,
    newArrivalAt,
    actionLinks,
    isCounterSale,
  );
  const html = buildContingencyEmailHtml(
    type,
    flightCode,
    origin,
    destination,
    seatClass,
    previousDepartureAt,
    previousArrivalAt,
    newDepartureAt,
    newArrivalAt,
    actionLinks,
    isCounterSale,
  );

  return { subject, text, html };
}
