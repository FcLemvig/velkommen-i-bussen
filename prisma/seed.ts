import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.session.deleteMany();
  await prisma.rideAssignment.deleteMany();
  await prisma.driverShift.deleteMany();
  await prisma.rideRequest.deleteMany();
  await prisma.citizenProfile.deleteMany();
  await prisma.driverProfile.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await hash("Velkommen123!", 12);

  const admin = await prisma.user.create({
    data: {
      name: "Anna Administrator",
      email: "admin@vib.dk",
      passwordHash,
      role: "ADMIN",
      membership: { create: { status: "ACTIVE" } }
    }
  });

  const citizenOne = await prisma.user.create({
    data: {
      name: "Kirsten Jensen",
      email: "kirsten@example.dk",
      passwordHash,
      role: "CITIZEN",
      citizenProfile: { create: { phone: "22112211", address: "Nørregade 12, Lemvig" } },
      membership: { create: { status: "ACTIVE" } }
    },
    include: { citizenProfile: true }
  });

  const citizenTwo = await prisma.user.create({
    data: {
      name: "Poul Madsen",
      email: "poul@example.dk",
      passwordHash,
      role: "CITIZEN",
      citizenProfile: { create: { phone: "22334455", address: "Søndergade 8, Lemvig" } },
      membership: { create: { status: "ACTIVE" } }
    },
    include: { citizenProfile: true }
  });

  const driverOne = await prisma.user.create({
    data: {
      name: "Lars Chauffør",
      email: "lars@example.dk",
      passwordHash,
      role: "DRIVER",
      driverProfile: {
        create: {
          phone: "40112233",
          licenseNumber: "DK-12345",
          notes: "Kører helst formiddag.",
          isActive: true
        }
      },
      membership: { create: { status: "ACTIVE" } }
    },
    include: { driverProfile: true }
  });

  const driverTwo = await prisma.user.create({
    data: {
      name: "Mette Chauffør",
      email: "mette@example.dk",
      passwordHash,
      role: "DRIVER",
      driverProfile: {
        create: {
          phone: "40224455",
          licenseNumber: "DK-67890",
          notes: "Kan tage ture tirsdag og torsdag.",
          isActive: true
        }
      },
      membership: { create: { status: "ACTIVE" } }
    },
    include: { driverProfile: true }
  });

  const rides = await prisma.rideRequest.createManyAndReturn({
    data: [
      {
        citizenProfileId: citizenOne.citizenProfile!.id,
        pickupAddress: "Nørregade 12, Lemvig",
        destinationAddress: "Lemvig Sundhedshus",
        rideDate: new Date("2026-07-02T00:00:00"),
        rideTime: "09:30",
        passengers: 1,
        purpose: "Lægebesøg",
        notes: "Skal hentes ved hoveddøren.",
        status: "ASSIGNED"
      },
      {
        citizenProfileId: citizenTwo.citizenProfile!.id,
        pickupAddress: "Søndergade 8, Lemvig",
        destinationAddress: "Frivilligcenter Lemvig",
        rideDate: new Date("2026-07-03T00:00:00"),
        rideTime: "13:00",
        passengers: 2,
        purpose: "Aktivitet",
        status: "PENDING"
      },
      {
        citizenProfileId: citizenOne.citizenProfile!.id,
        pickupAddress: "Nørregade 12, Lemvig",
        destinationAddress: "Apoteket i Lemvig",
        rideDate: new Date("2026-07-04T00:00:00"),
        rideTime: "10:15",
        passengers: 1,
        purpose: "Medicin",
        status: "APPROVED"
      },
      {
        citizenProfileId: citizenTwo.citizenProfile!.id,
        pickupAddress: "Søndergade 8, Lemvig",
        destinationAddress: "Lemvig Bibliotek",
        rideDate: new Date("2026-07-05T00:00:00"),
        rideTime: "14:30",
        passengers: 1,
        purpose: "Arrangement",
        notes: "Medbringer rollator.",
        status: "ASSIGNED"
      },
      {
        citizenProfileId: citizenOne.citizenProfile!.id,
        pickupAddress: "Nørregade 12, Lemvig",
        destinationAddress: "Lemvig Kirke",
        rideDate: new Date("2026-06-29T00:00:00"),
        rideTime: "11:00",
        passengers: 1,
        purpose: "Socialt besøg",
        status: "COMPLETED"
      }
    ]
  });

  await prisma.rideAssignment.createMany({
    data: [
      { rideRequestId: rides[0].id, driverProfileId: driverOne.driverProfile!.id },
      { rideRequestId: rides[3].id, driverProfileId: driverTwo.driverProfile!.id }
    ]
  });

  await prisma.driverShift.createMany({
    data: [
      {
        driverProfileId: driverOne.driverProfile!.id,
        shiftDate: new Date("2026-07-02T00:00:00"),
        startTime: "09:00",
        endTime: "11:00",
        notes: "Formiddag Lemvig"
      },
      {
        shiftDate: new Date("2026-07-03T00:00:00"),
        startTime: "12:00",
        endTime: "14:00",
        notes: "Ledig vagt"
      }
    ]
  });

  console.log(`Seed færdig. Admin: ${admin.email}, kodeord: Velkommen123!`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
