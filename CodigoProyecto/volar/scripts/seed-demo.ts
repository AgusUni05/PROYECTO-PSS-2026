/**
 * Datos demo para probar el flujo de pago (US-20/US-21) sin implementar las
 * US previas: crea un vuelo en venta y una reserva PENDING_PAYMENT con el
 * cupo retenido y 3 pasajeros ya cargados (como si US-15..US-19 se hicieran
 * a mano).
 *
 * Uso:
 *   pnpm seed:demo          crea (o restaura) los datos demo
 *   pnpm seed:demo --clean  elimina los datos demo
 *
 * Todo lo creado usa IDs fijos con el tag SEED*, así que re-ejecutar el
 * script restaura el estado inicial en lugar de duplicar filas, y --clean
 * nunca toca datos reales del sistema.
 */
import "dotenv/config";
import { prisma } from "../lib/prisma";
import { formatCurrency, formatDate } from "../features/flights/format";

const SEED = "0".repeat(21); // 21 dígitos + tag de 5 = ULID de 26, válido para idSchema

const IDS = {
  user: `USU_${SEED}SEEDA`,
  origin: `AER_${SEED}SEEDB`,
  destination: `AER_${SEED}SEEDC`,
  airplane: `AVI_${SEED}SEEDD`,
  route: `TRA_${SEED}SEEDE`,
  salesPeriod: `PER_${SEED}SEEDF`,
  flight: `VUE_${SEED}SEEDG`,
  booking: `RES_${SEED}SEEDH`,
  tickets: [`PAS_${SEED}SEEDJ`, `PAS_${SEED}SEEDK`, `PAS_${SEED}SEEDM`],
} as const;

// Datos de la reserva demo: 3 pasajes Economy, $ 45.000 c/u.
const QUANTITY = 3;
const UNIT_PRICE = 45000;
const TOTAL_AMOUNT = UNIT_PRICE * QUANTITY;

/** Fecha UTC (medianoche) desplazada desde hoy, para campos @db.Date. */
function utcDaysFromToday(days: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days));
}

async function clean() {
  // Orden de borrado: las FK con RESTRICT exigen ir de hoja a raíz.
  await prisma.payment.deleteMany({ where: { bookingId: IDS.booking } });
  await prisma.invoice.deleteMany({ where: { bookingId: IDS.booking } }); // US-23
  await prisma.emailNotification.deleteMany({
    where: { OR: [{ bookingId: IDS.booking }, { flightChange: { flightId: IDS.flight } }] },
  });
  await prisma.flightChange.deleteMany({ where: { flightId: IDS.flight } });
  await prisma.booking.deleteMany({ where: { id: IDS.booking } }); // borra sus tickets en cascada
  await prisma.flight.deleteMany({ where: { id: IDS.flight } });
  await prisma.salesPeriod.deleteMany({ where: { id: IDS.salesPeriod } });
  await prisma.route.deleteMany({ where: { id: IDS.route } });
  await prisma.airplane.deleteMany({ where: { id: IDS.airplane } });
  await prisma.airport.deleteMany({ where: { id: { in: [IDS.origin, IDS.destination] } } });
  await prisma.user.deleteMany({ where: { id: IDS.user } });
  console.log("Datos demo eliminados.");
}

async function seed() {
  const flightDate = utcDaysFromToday(14);
  const departureAt = new Date(flightDate.getTime() + 8.5 * 3_600_000); // 08:30 UTC
  const arrivalAt = new Date(flightDate.getTime() + 11.5 * 3_600_000); // 11:30 UTC
  const holdExpiresAt = new Date(Date.now() + 10 * 60_000);

  await prisma.user.upsert({
    where: { clerkId: "seed-demo" },
    update: {},
    create: {
      id: IDS.user,
      clerkId: "seed-demo",
      email: "demo@volar.test",
      firstName: "Demo",
      lastName: "Seed",
    },
  });

  await prisma.airport.upsert({
    where: { code: "DEM1" },
    update: { name: "Aeropuerto Demo Origen", city: "Ciudad Demo", isActive: true },
    create: {
      id: IDS.origin,
      code: "DEM1",
      name: "Aeropuerto Demo Origen",
      city: "Ciudad Demo",
    },
  });
  await prisma.airport.upsert({
    where: { code: "DEM2" },
    update: { name: "Aeropuerto Demo Destino", city: "Destino Demo", isActive: true },
    create: {
      id: IDS.destination,
      code: "DEM2",
      name: "Aeropuerto Demo Destino",
      city: "Destino Demo",
    },
  });

  await prisma.airplane.upsert({
    where: { identifier: "LV-DEMO" },
    update: { economySeats: 150, firstClassSeats: 12, isActive: true },
    create: {
      id: IDS.airplane,
      identifier: "LV-DEMO",
      model: "Airbus A320 (demo)",
      economySeats: 150,
      firstClassSeats: 12,
    },
  });

  await prisma.route.upsert({
    where: { code: "TR-DEMO" },
    update: { originId: IDS.origin, destinationId: IDS.destination, isActive: true },
    create: {
      id: IDS.route,
      code: "TR-DEMO",
      originId: IDS.origin,
      destinationId: IDS.destination,
      // Todos los días: así la fecha del vuelo (hoy + 14) siempre opera.
      operatingDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"],
      departureTime: "08:30",
      arrivalTime: "11:30",
    },
  });

  await prisma.salesPeriod.upsert({
    where: { id: IDS.salesPeriod },
    update: {
      routeId: IDS.route,
      startDate: utcDaysFromToday(-30),
      endDate: utcDaysFromToday(90),
      airplaneId: IDS.airplane,
      economyCapacity: 150,
      firstClassCapacity: 12,
      economyFare: UNIT_PRICE,
      firstClassFare: 90000,
    },
    create: {
      id: IDS.salesPeriod,
      routeId: IDS.route,
      startDate: utcDaysFromToday(-30),
      endDate: utcDaysFromToday(90),
      airplaneId: IDS.airplane,
      economyCapacity: 150,
      firstClassCapacity: 12,
      economyFare: UNIT_PRICE,
      firstClassFare: 90000,
      createdById: IDS.user,
    },
  });

  await prisma.flight.upsert({
    where: { code: "VU-DEMO-01" },
    update: {
      routeId: IDS.route,
      salesPeriodId: IDS.salesPeriod,
      date: flightDate,
      departureAt,
      arrivalAt,
      airplaneId: IDS.airplane,
      economyCapacity: 150,
      firstClassCapacity: 12,
      economyOccupied: QUANTITY, // la retención de la reserva demo
      firstClassOccupied: 0,
      economyFare: UNIT_PRICE,
      firstClassFare: 90000,
      status: "SCHEDULED",
      cancelledAt: null,
      cancellationReason: null,
    },
    create: {
      id: IDS.flight,
      code: "VU-DEMO-01",
      routeId: IDS.route,
      salesPeriodId: IDS.salesPeriod,
      date: flightDate,
      departureAt,
      arrivalAt,
      airplaneId: IDS.airplane,
      economyCapacity: 150,
      firstClassCapacity: 12,
      economyOccupied: QUANTITY,
      firstClassFare: 90000,
      economyFare: UNIT_PRICE,
      createdById: IDS.user,
    },
  });

  // Intentos de pago y comprobantes de pruebas anteriores: se descartan al
  // restaurar, así la reserva vuelve a un estado cobrable (US-20..US-24).
  await prisma.payment.deleteMany({ where: { bookingId: IDS.booking } });
  await prisma.invoice.deleteMany({ where: { bookingId: IDS.booking } }); // US-23
  await prisma.emailNotification.deleteMany({ where: { bookingId: IDS.booking } }); // US-24

  await prisma.booking.upsert({
    where: { code: "DEMO0001" },
    update: {
      flightId: IDS.flight,
      seatClass: "ECONOMY",
      quantity: QUANTITY,
      unitPrice: UNIT_PRICE,
      totalAmount: TOTAL_AMOUNT,
      status: "PENDING_PAYMENT",
      holdExpiresAt,
      channel: "WEB",
      buyerId: null,
      contactEmail: "demo@volar.test",
      contactName: "Pasajero Demo",
      sellerId: null,
      confirmedAt: null,
    },
    create: {
      id: IDS.booking,
      code: "DEMO0001",
      flightId: IDS.flight,
      seatClass: "ECONOMY",
      quantity: QUANTITY,
      unitPrice: UNIT_PRICE,
      totalAmount: TOTAL_AMOUNT,
      status: "PENDING_PAYMENT",
      holdExpiresAt,
      channel: "WEB",
      contactEmail: "demo@volar.test",
      contactName: "Pasajero Demo",
    },
  });

  const passengers = [
    { firstName: "María", lastName: "Demo", documentType: "DNI" as const, documentNumber: "30000001" },
    { firstName: "Juan", lastName: "Demo", documentType: "DNI" as const, documentNumber: "30000002" },
    { firstName: "Ana", lastName: "Demo", documentType: "DNI" as const, documentNumber: "30000003" },
  ];
  for (const [index, passenger] of passengers.entries()) {
    await prisma.ticket.upsert({
      where: { id: IDS.tickets[index] },
      update: {
        bookingId: IDS.booking,
        flightId: IDS.flight,
        seatClass: "ECONOMY",
        unitPrice: UNIT_PRICE,
        ...passenger,
        status: "PENDING",
        number: null,
        seat: null,
        issuedAt: null,
        pdfPath: null,
      },
      create: {
        id: IDS.tickets[index],
        bookingId: IDS.booking,
        flightId: IDS.flight,
        seatClass: "ECONOMY",
        unitPrice: UNIT_PRICE,
        ...passenger,
      },
    });
  }

  console.log("Datos demo listos.");
  console.log(`  Reserva DEMO0001 — ${QUANTITY} pasajes Economy — ${formatCurrency(TOTAL_AMOUNT)}`);
  console.log(`  Vuelo VU-DEMO-01 (DEM1 → DEM2) el ${formatDate(flightDate)}`);
  console.log(
    `  Retención hasta ${holdExpiresAt.toISOString().slice(11, 16)} UTC (10 min). Reejecutá el script para renovarla.`,
  );
  console.log("  Probá el pago en /compra/pago?reserva=DEMO0001");
}

async function main() {
  if (process.argv.includes("--clean")) {
    await clean();
  } else {
    await seed();
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
