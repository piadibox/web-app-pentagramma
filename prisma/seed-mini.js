const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  // STRUMENTO
  const instrument = await prisma.instrument.upsert({
    where: { name: "Pianoforte" },
    update: {},
    create: { name: "Pianoforte" },
  });

  // INSEGNANTE
  const teacher = await prisma.user.upsert({
    where: { username: "bruno.montrone" },
    update: {},
    create: {
      username: "bruno.montrone",
      fullName: "Bruno Montrone",
      role: "TEACHER",
      passwordHash: "TEMP",
      active: true,
    },
  });

  // STUDENTE
  const student = await prisma.user.upsert({
    where: { username: "fabrizio.patarino" },
    update: {},
    create: {
      username: "fabrizio.patarino",
      fullName: "Fabrizio Patarino",
      role: "STUDENT",
      passwordHash: "TEMP",
      active: true,
    },
  });

  console.log("CREATI / TROVATI:");
  console.log({
    instrumentId: instrument.id,
    teacherId: teacher.id,
    studentId: student.id,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
