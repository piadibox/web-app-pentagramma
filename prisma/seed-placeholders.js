const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  // INSEGNANTE placeholder
  const teacher = await prisma.user.upsert({
    where: { username: "john.smith" },
    update: {},
    create: {
      username: "john.smith",
      fullName: "John Smith",
      role: "TEACHER",
      passwordHash,
      active: true,
    },
  });

  // STUDENTE placeholder
  const student = await prisma.user.upsert({
    where: { username: "mario.rossi" },
    update: {},
    create: {
      username: "mario.rossi",
      fullName: "Mario Rossi",
      role: "STUDENT",
      passwordHash,
      active: true,
    },
  });

  console.log("CREATI / TROVATI:");
  console.log({ teacherId: teacher.id, studentId: student.id });
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
