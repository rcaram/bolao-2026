import { db, usersTable, matchesTable, invitesTable, groupsTable, teamsTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const GROUPS = [
  { name: "A", description: "Group A" },
  { name: "B", description: "Group B" },
  { name: "C", description: "Group C" },
  { name: "D", description: "Group D" },
  { name: "E", description: "Group E" },
  { name: "F", description: "Group F" },
  { name: "G", description: "Group G" },
  { name: "H", description: "Group H" },
  { name: "I", description: "Group I" },
  { name: "J", description: "Group J" },
  { name: "K", description: "Group K" },
  { name: "L", description: "Group L" },
];

// 48 teams for World Cup 2026 (4 teams per group, 12 groups)
const TEAMS_BY_GROUP: Array<{ name: string; flag: string; fifaCode: string }[]> = [
  // Group A
  [
    { name: "USA", flag: "🇺🇸", fifaCode: "USA" },
    { name: "Mexico", flag: "🇲🇽", fifaCode: "MEX" },
    { name: "Canada", flag: "🇨🇦", fifaCode: "CAN" },
    { name: "Uruguay", flag: "🇺🇾", fifaCode: "URU" },
  ],
  // Group B
  [
    { name: "Brazil", flag: "🇧🇷", fifaCode: "BRA" },
    { name: "Colombia", flag: "🇨🇴", fifaCode: "COL" },
    { name: "Ecuador", flag: "🇪🇨", fifaCode: "ECU" },
    { name: "Bolivia", flag: "🇧🇴", fifaCode: "BOL" },
  ],
  // Group C
  [
    { name: "Argentina", flag: "🇦🇷", fifaCode: "ARG" },
    { name: "Chile", flag: "🇨🇱", fifaCode: "CHI" },
    { name: "Paraguay", flag: "🇵🇾", fifaCode: "PAR" },
    { name: "Venezuela", flag: "🇻🇪", fifaCode: "VEN" },
  ],
  // Group D
  [
    { name: "France", flag: "🇫🇷", fifaCode: "FRA" },
    { name: "Belgium", flag: "🇧🇪", fifaCode: "BEL" },
    { name: "Netherlands", flag: "🇳🇱", fifaCode: "NED" },
    { name: "Senegal", flag: "🇸🇳", fifaCode: "SEN" },
  ],
  // Group E
  [
    { name: "Spain", flag: "🇪🇸", fifaCode: "ESP" },
    { name: "Germany", flag: "🇩🇪", fifaCode: "GER" },
    { name: "Portugal", flag: "🇵🇹", fifaCode: "POR" },
    { name: "Morocco", flag: "🇲🇦", fifaCode: "MAR" },
  ],
  // Group F
  [
    { name: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", fifaCode: "ENG" },
    { name: "Italy", flag: "🇮🇹", fifaCode: "ITA" },
    { name: "Croatia", flag: "🇭🇷", fifaCode: "CRO" },
    { name: "Tunisia", flag: "🇹🇳", fifaCode: "TUN" },
  ],
  // Group G
  [
    { name: "Japan", flag: "🇯🇵", fifaCode: "JPN" },
    { name: "South Korea", flag: "🇰🇷", fifaCode: "KOR" },
    { name: "Australia", flag: "🇦🇺", fifaCode: "AUS" },
    { name: "Saudi Arabia", flag: "🇸🇦", fifaCode: "KSA" },
  ],
  // Group H
  [
    { name: "Nigeria", flag: "🇳🇬", fifaCode: "NGA" },
    { name: "Ivory Coast", flag: "🇨🇮", fifaCode: "CIV" },
    { name: "Egypt", flag: "🇪🇬", fifaCode: "EGY" },
    { name: "Cameroon", flag: "🇨🇲", fifaCode: "CMR" },
  ],
  // Group I
  [
    { name: "Iran", flag: "🇮🇷", fifaCode: "IRN" },
    { name: "Qatar", flag: "🇶🇦", fifaCode: "QAT" },
    { name: "Iraq", flag: "🇮🇶", fifaCode: "IRQ" },
    { name: "Uzbekistan", flag: "🇺🇿", fifaCode: "UZB" },
  ],
  // Group J
  [
    { name: "Switzerland", flag: "🇨🇭", fifaCode: "SUI" },
    { name: "Denmark", flag: "🇩🇰", fifaCode: "DEN" },
    { name: "Austria", flag: "🇦🇹", fifaCode: "AUT" },
    { name: "Serbia", flag: "🇷🇸", fifaCode: "SRB" },
  ],
  // Group K
  [
    { name: "Poland", flag: "🇵🇱", fifaCode: "POL" },
    { name: "Czech Republic", flag: "🇨🇿", fifaCode: "CZE" },
    { name: "Slovakia", flag: "🇸🇰", fifaCode: "SVK" },
    { name: "Slovenia", flag: "🇸🇮", fifaCode: "SVN" },
  ],
  // Group L
  [
    { name: "New Zealand", flag: "🇳🇿", fifaCode: "NZL" },
    { name: "Peru", flag: "🇵🇪", fifaCode: "PER" },
    { name: "Costa Rica", flag: "🇨🇷", fifaCode: "CRC" },
    { name: "Panama", flag: "🇵🇦", fifaCode: "PAN" },
  ],
];

async function seed() {
  console.log("Seeding database...");

  const existingUsers = await db.select({ id: usersTable.id }).from(usersTable);
  if (existingUsers.length > 0) {
    console.log("Database already seeded, skipping...");
    process.exit(0);
  }

  // Users
  const adminHash = await bcrypt.hash("admin123", 10);
  const [admin] = await db.insert(usersTable).values({ email: "admin@bolao.com", passwordHash: adminHash, name: "Admin", role: "admin" }).returning();
  console.log("Created admin:", admin.email);

  const participants = [
    { name: "João Silva", email: "joao@example.com" },
    { name: "Maria Santos", email: "maria@example.com" },
    { name: "Pedro Costa", email: "pedro@example.com" },
    { name: "Ana Rodrigues", email: "ana@example.com" },
  ];
  for (const p of participants) {
    const hash = await bcrypt.hash("senha123", 10);
    await db.insert(usersTable).values({ email: p.email, passwordHash: hash, name: p.name, role: "participant" });
    console.log("Created participant:", p.email);
  }

  // Groups (A-L for World Cup 2026)
  const insertedGroups: typeof groupsTable.$inferSelect[] = [];
  for (const g of GROUPS) {
    const [group] = await db.insert(groupsTable).values(g).returning();
    insertedGroups.push(group);
  }
  console.log(`Created ${insertedGroups.length} groups (A-L)`);

  // Teams (48 teams, 4 per group)
  const insertedTeams: typeof teamsTable.$inferSelect[] = [];
  for (let gi = 0; gi < TEAMS_BY_GROUP.length; gi++) {
    const group = insertedGroups[gi];
    for (const t of TEAMS_BY_GROUP[gi]) {
      const [team] = await db.insert(teamsTable).values({ ...t, groupId: group.id }).returning();
      insertedTeams.push(team);
    }
  }
  console.log(`Created ${insertedTeams.length} teams`);

  function teamByCode(code: string) {
    return insertedTeams.find((t) => t.fifaCode === code)!;
  }

  function groupByName(name: string) {
    return insertedGroups.find((g) => g.name === name)!;
  }

  const now = new Date();

  // Sample group stage matches (one per group, mix of upcoming/finished)
  const groupMatches = [
    // Finished matches
    { home: "USA", away: "MEX", grp: "A", venue: "SoFi Stadium, Los Angeles", hoursOffset: -26, homeScore: 2, awayScore: 1, status: "finished" as const, matchNumber: 1 },
    { home: "BRA", away: "COL", grp: "B", venue: "MetLife Stadium, New York", hoursOffset: -24, homeScore: 3, awayScore: 0, status: "finished" as const, matchNumber: 2 },
    { home: "ESP", away: "GER", grp: "E", venue: "AT&T Stadium, Dallas", hoursOffset: -22, homeScore: 1, awayScore: 1, status: "finished" as const, matchNumber: 3 },
    // Upcoming matches
    { home: "ARG", away: "CHI", grp: "C", venue: "Levi's Stadium, San Francisco", hoursOffset: 2, homeScore: null, awayScore: null, status: "upcoming" as const, matchNumber: 4 },
    { home: "FRA", away: "BEL", grp: "D", venue: "Rose Bowl, Los Angeles", hoursOffset: 4, homeScore: null, awayScore: null, status: "upcoming" as const, matchNumber: 5 },
    { home: "ENG", away: "ITA", grp: "F", venue: "Gillette Stadium, Boston", hoursOffset: 6, homeScore: null, awayScore: null, status: "upcoming" as const, matchNumber: 6 },
    { home: "JPN", away: "KOR", grp: "G", venue: "SoFi Stadium, Los Angeles", hoursOffset: 28, homeScore: null, awayScore: null, status: "upcoming" as const, matchNumber: 7 },
    { home: "NGA", away: "CIV", grp: "H", venue: "Hard Rock Stadium, Miami", hoursOffset: 30, homeScore: null, awayScore: null, status: "upcoming" as const, matchNumber: 8 },
    { home: "IRN", away: "QAT", grp: "I", venue: "NRG Stadium, Houston", hoursOffset: 48, homeScore: null, awayScore: null, status: "upcoming" as const, matchNumber: 9 },
    { home: "SUI", away: "DEN", grp: "J", venue: "BC Place, Vancouver", hoursOffset: 50, homeScore: null, awayScore: null, status: "upcoming" as const, matchNumber: 10 },
    { home: "POL", away: "CZE", grp: "K", venue: "Estadio Azteca, Mexico City", hoursOffset: 72, homeScore: null, awayScore: null, status: "upcoming" as const, matchNumber: 11 },
    { home: "PER", away: "CRC", grp: "L", venue: "BMO Field, Toronto", hoursOffset: 74, homeScore: null, awayScore: null, status: "upcoming" as const, matchNumber: 12 },
  ];

  for (const m of groupMatches) {
    const homeTeam = teamByCode(m.home);
    const awayTeam = teamByCode(m.away);
    const group = groupByName(m.grp);
    await db.insert(matchesTable).values({
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      groupId: group.id,
      matchDate: new Date(now.getTime() + m.hoursOffset * 60 * 60 * 1000),
      stage: "group",
      matchNumber: m.matchNumber,
      venue: m.venue,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      status: m.status,
    });
  }

  // Knockout stage placeholders
  const knockoutMatches = [
    { stage: "round_of_32" as const, home: "Winner Group A", away: "3rd Best Group", hoursOffset: 120, matchNumber: 49, venue: "SoFi Stadium, Los Angeles" },
    { stage: "round_of_32" as const, home: "Winner Group B", away: "3rd Best Group", hoursOffset: 122, matchNumber: 50, venue: "MetLife Stadium, New York" },
    { stage: "round_of_16" as const, home: "Winner R32-1", away: "Winner R32-2", hoursOffset: 192, matchNumber: 57, venue: "AT&T Stadium, Dallas" },
    { stage: "quarterfinal" as const, home: "Winner R16-1", away: "Winner R16-2", hoursOffset: 264, matchNumber: 61, venue: "Rose Bowl, Los Angeles" },
    { stage: "semifinal" as const, home: "Winner QF-1", away: "Winner QF-2", hoursOffset: 336, matchNumber: 63, venue: "MetLife Stadium, New York" },
    { stage: "third_place" as const, home: "Loser SF-1", away: "Loser SF-2", hoursOffset: 408, matchNumber: 64, venue: "Estadio Azteca, Mexico City" },
    { stage: "final" as const, home: "Winner SF-1", away: "Winner SF-2", hoursOffset: 432, matchNumber: 65, venue: "MetLife Stadium, New York" },
  ];

  for (const m of knockoutMatches) {
    await db.insert(matchesTable).values({
      homeTeamId: null,
      awayTeamId: null,
      homePlaceholder: m.home,
      awayPlaceholder: m.away,
      groupId: null,
      matchDate: new Date(now.getTime() + m.hoursOffset * 60 * 60 * 1000),
      stage: m.stage,
      matchNumber: m.matchNumber,
      venue: m.venue,
      status: "upcoming",
    });
  }

  console.log(`Created ${groupMatches.length} group stage matches + ${knockoutMatches.length} knockout matches`);

  // Invite token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(invitesTable).values({ email: "novo@exemplo.com", token, expiresAt });
  console.log("Sample invite token:", token);

  console.log("\n✅ Seed complete!");
  console.log("Admin: admin@bolao.com / admin123");
  console.log("Participant: joao@example.com / senha123");
  console.log("World Cup 2026: 12 groups (A-L), 48 teams, group + knockout matches");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
