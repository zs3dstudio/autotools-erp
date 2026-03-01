import { db } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function setSuperAdmin() {
  const targetEmail = "meshcraftstudio@gmail.com";
  const temporaryPassword = "tempAdmin123!"; // Temporary password, user should change this after first login
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);

  let user = await db.query.users.findFirst({
    where: eq(users.email, targetEmail),
  });

  if (user) {
    // User exists, update role and password if necessary
    console.log(`Updating user ${targetEmail} to SuperAdmin role.`);
    await db.update(users)
      .set({ role: "SuperAdmin", passwordHash, name: "Meshcraft Studio Admin" })
      .where(eq(users.email, targetEmail));
  } else {
    // User does not exist, create new SuperAdmin user
    console.log(`Creating new SuperAdmin user: ${targetEmail}`);
    await db.insert(users).values({
      openId: `superadmin-${Date.now()}`,
      name: "Meshcraft Studio Admin",
      email: targetEmail,
      passwordHash,
      role: "SuperAdmin",
      isActive: true,
      loginMethod: "email",
    });
  }
  console.log(`User ${targetEmail} is now SuperAdmin with temporary password: ${temporaryPassword}`);
}

setSuperAdmin().catch(console.error);
