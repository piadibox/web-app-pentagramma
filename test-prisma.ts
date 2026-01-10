import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const plainPassword = "Admin123!"; // cambia qui
  const passwordHash = await bcrypt.hash(plainPassword, 12);

  const user = await prisma.user.create({
    data: {
      username: "admin2",
      fullName: "Admin Hash",
      role: Role.ADMIN,
      passwordHash,
      active: true,
    },
  });

  console.log("CREATED:", user);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
