import { describe, expect, it } from "vitest";
import { buildContingencyOutbox, type AffectedTicket } from "./contingency";

const tickets: AffectedTicket[] = [
  { id: "PAS_1", booking: { id: "RES_1", contactEmail: "a@x.com" } },
  { id: "PAS_2", booking: { id: "RES_1", contactEmail: "a@x.com" } },
  { id: "PAS_3", booking: { id: "RES_2", contactEmail: "b@x.com" } },
];

describe("buildContingencyOutbox", () => {
  it("devuelve una contingencia por pasaje y un email PENDING por comprador", () => {
    const result = buildContingencyOutbox({
      flightChangeId: "CVU_1",
      type: "CANCELLATION",
      flightCode: "VU-20261001-001",
      tickets,
      previousDepartureAt: new Date("2026-10-01T08:30:00.000Z"),
      previousArrivalAt: new Date("2026-10-01T10:00:00.000Z"),
    });

    expect(result.contingencies).toHaveLength(3);
    expect(result.emails).toHaveLength(2);

    expect(result.contingencies.map((c) => c.ticketId)).toEqual(["PAS_1", "PAS_2", "PAS_3"]);
    expect(result.contingencies.every((c) => c.accessToken && c.accessToken.length > 0)).toBe(true);
    expect(result.contingencies.every((c) => c.flightChangeId === "CVU_1")).toBe(true);

    const tokens = new Set(result.contingencies.map((c) => c.accessToken));
    expect(tokens.size).toBe(3);

    expect(result.emails.every((e) => e.status === "PENDING")).toBe(true);
    expect(result.emails.every((e) => e.flightChangeId === "CVU_1")).toBe(true);
    expect(result.emails.map((e) => e.recipientEmail).sort()).toEqual(["a@x.com", "b@x.com"]);
  });

  it("deduplica pasajes por ticketId para evitar registros duplicados (changeId, ticketId)", () => {
    const duplicated = [
      ...tickets,
      { id: "PAS_1", booking: { id: "RES_3", contactEmail: "c@x.com" } },
    ];

    const result = buildContingencyOutbox({
      flightChangeId: "CVU_1",
      type: "CANCELLATION",
      flightCode: "VU-20261001-001",
      tickets: duplicated,
      previousDepartureAt: new Date("2026-10-01T08:30:00.000Z"),
      previousArrivalAt: new Date("2026-10-01T10:00:00.000Z"),
    });

    expect(result.contingencies).toHaveLength(3);
    expect(result.emails).toHaveLength(2); // RES_1 y RES_2; el duplicado con RES_3 se descarta
  });

  it("genera accessTokens únicos dentro del lote", () => {
    const manyTickets = Array.from({ length: 50 }, (_, i) => ({
      id: `PAS_${i}`,
      booking: { id: "RES_1", contactEmail: "a@x.com" },
    }));

    const result = buildContingencyOutbox({
      flightChangeId: "CVU_1",
      type: "CANCELLATION",
      flightCode: "VU-20261001-001",
      tickets: manyTickets,
      previousDepartureAt: new Date("2026-10-01T08:30:00.000Z"),
      previousArrivalAt: new Date("2026-10-01T10:00:00.000Z"),
    });

    const tokens = result.contingencies.map((c) => c.accessToken);
    expect(new Set(tokens).size).toBe(50);
  });

  it("arma asunto y cuerpo para SCHEDULE_CHANGE usando los horarios anterior y nuevo", () => {
    const result = buildContingencyOutbox({
      flightChangeId: "CVU_1",
      type: "SCHEDULE_CHANGE",
      flightCode: "VU-20261001-001",
      tickets: [tickets[0]],
      previousDepartureAt: new Date("2026-10-01T08:30:00.000Z"),
      previousArrivalAt: new Date("2026-10-01T10:00:00.000Z"),
      newDepartureAt: new Date("2026-10-01T09:00:00.000Z"),
      newArrivalAt: new Date("2026-10-01T10:30:00.000Z"),
    });

    const email = result.emails[0];
    expect(email.emailType).toBe("FLIGHT_SCHEDULE_CHANGE");
    expect(email.subject).toMatch(/Cambio de horario/);
    expect(email.subject).toMatch(/VU-20261001-001/);
    expect(email.body).toMatch(/cambió de horario/);
    expect(email.body).toMatch(/08:30/);
    expect(email.body).toMatch(/10:00/);
    expect(email.body).toMatch(/09:00/);
    expect(email.body).toMatch(/10:30/);
  });

  it("arma asunto y cuerpo para CANCELLATION", () => {
    const result = buildContingencyOutbox({
      flightChangeId: "CVU_1",
      type: "CANCELLATION",
      flightCode: "VU-20261001-001",
      tickets: [tickets[0]],
      previousDepartureAt: new Date("2026-10-01T08:30:00.000Z"),
      previousArrivalAt: new Date("2026-10-01T10:00:00.000Z"),
    });

    const email = result.emails[0];
    expect(email.emailType).toBe("FLIGHT_CANCELLATION");
    expect(email.subject).toMatch(/Cancelación/);
    expect(email.subject).toMatch(/VU-20261001-001/);
    expect(email.body).toMatch(/fue cancelado/);
  });

  it("devuelve listas vacías cuando no hay pasajes afectados", () => {
    const result = buildContingencyOutbox({
      flightChangeId: "CVU_1",
      type: "CANCELLATION",
      flightCode: "VU-20261001-001",
      tickets: [],
      previousDepartureAt: new Date("2026-10-01T08:30:00.000Z"),
      previousArrivalAt: new Date("2026-10-01T10:00:00.000Z"),
    });

    expect(result.contingencies).toEqual([]);
    expect(result.emails).toEqual([]);
  });
});
