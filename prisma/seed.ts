import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("password123", 10);

  // Users
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      fullName: "Admin User",
      role: Role.ADMIN,
      passwordHash: password,
    },
  });

  const teacher = await prisma.user.upsert({
    where: { username: "teacher1" },
    update: {},
    create: {
      username: "teacher1",
      fullName: "Mario Rossi",
      role: Role.TEACHER,
      passwordHash: password,
    },
  });

  const student = await prisma.user.upsert({
    where: { username: "student1" },
    update: {},
    create: {
      username: "student1",
      fullName: "Luca Bianchi",
      role: Role.STUDENT,
      passwordHash: password,
    },
  });

  // Instruments
  const piano = await prisma.instrument.upsert({
    where: { name: "Piano" },
    update: {},
    create: { name: "Piano" },
  });

  const guitar = await prisma.instrument.upsert({
    where: { name: "Guitar" },
    update: {},
    create: { name: "Guitar" },
  });

  // Assignment
  await prisma.studentAssignment.create({
    data: {
      studentId: student.id,
      teacherId: teacher.id,
      instrumentId: piano.id,
      weekday: 1, // martedì
      startTime: "15:00",
      durationMins: 60,
    },
  });

  console.log("🌱 Seed completato");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
