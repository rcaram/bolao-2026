import { db, usersTable, matchesTable, invitesTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

async function seed() {
  console.log("Seeding database...");

  const existing = await db.select({ id: usersTable.id }).from(usersTable);
  if (existing.length > 0) {
    console.log("Database already seeded, skipping...");
    process.exit(0);
  }

  const adminHash = await bcrypt.hash("admin123", 10);
  const [admin] = await db
    .insert(usersTable)
    .values({
      email: "admin@bolao.com",
      passwordHash: adminHash,
      name: "Admin",
      role: "admin",
    })
    .returning();
  console.log("Created admin user:", admin.email);

  const participants = [
    { name: "João Silva", email: "joao@example.com" },
    { name: "Maria Santos", email: "maria@example.com" },
    { name: "Pedro Costa", email: "pedro@example.com" },
  ];

  for (const p of participants) {
    const hash = await bcrypt.hash("senha123", 10);
    await db.insert(usersTable).values({
      email: p.email,
      passwordHash: hash,
      name: p.name,
      role: "participant",
    });
    console.log("Created participant:", p.email);
  }

  const now = new Date();
  const matches = [
    {
      homeTeam: "Brazil",
      awayTeam: "Mexico",
      homeTeamFlag: "🇧🇷",
      awayTeamFlag: "🇲🇽",
      matchDate: new Date(now.getTime() + 2 * 60 * 60 * 1000),
      stage: "group" as const,
      groupName: "Group A",
      venue: "SoFi Stadium, Los Angeles",
    },
    {
      homeTeam: "Argentina",
      awayTeam: "Canada",
      homeTeamFlag: "🇦🇷",
      awayTeamFlag: "🇨🇦",
      matchDate: new Date(now.getTime() + 5 * 60 * 60 * 1000),
      stage: "group" as const,
      groupName: "Group B",
      venue: "MetLife Stadium, New York",
    },
    {
      homeTeam: "France",
      awayTeam: "USA",
      homeTeamFlag: "🇫🇷",
      awayTeamFlag: "🇺🇸",
      matchDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      stage: "group" as const,
      groupName: "Group C",
      venue: "AT&T Stadium, Dallas",
    },
    {
      homeTeam: "Germany",
      awayTeam: "Japan",
      homeTeamFlag: "🇩🇪",
      awayTeamFlag: "🇯🇵",
      matchDate: new Date(now.getTime() + 48 * 60 * 60 * 1000),
      stage: "group" as const,
      groupName: "Group D",
      venue: "Levi's Stadium, San Francisco",
    },
    {
      homeTeam: "England",
      awayTeam: "Spain",
      homeTeamFlag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
      awayTeamFlag: "🇪🇸",
      matchDate: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      stage: "group" as const,
      groupName: "Group E",
      venue: "Gillette Stadium, Boston",
      homeScore: 2,
      awayScore: 1,
      status: "finished" as const,
    },
    {
      homeTeam: "Portugal",
      awayTeam: "Morocco",
      homeTeamFlag: "🇵🇹",
      awayTeamFlag: "🇲🇦",
      matchDate: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      stage: "group" as const,
      groupName: "Group F",
      venue: "Hard Rock Stadium, Miami",
      homeScore: 3,
      awayScore: 2,
      status: "finished" as const,
    },
  ];

  for (const m of matches) {
    const { homeScore, awayScore, status, ...rest } = m as any;
    await db.insert(matchesTable).values({
      ...rest,
      homeScore: homeScore ?? null,
      awayScore: awayScore ?? null,
      status: status ?? "upcoming",
    });
  }
  console.log(`Created ${matches.length} sample matches`);

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const [invite] = await db
    .insert(invitesTable)
    .values({ email: "novo@exemplo.com", token, expiresAt })
    .returning();
  console.log("Sample invite token:", token);
  console.log("Register URL: /register?token=" + token);

  console.log("\nSeed complete!");
  console.log("Admin login: admin@bolao.com / admin123");
  console.log("Participant login: joao@example.com / senha123");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
