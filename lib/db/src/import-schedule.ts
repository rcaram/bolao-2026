/**
 * FIFA World Cup 2026 – Complete Group Stage Import
 * Confirmed groups from Wikipedia (March 2026)
 */
import { betsTable, bonusBetsTable, db, groupsTable, matchesTable, teamsTable } from "./index";

function utc(dateStr: string, timeHHMM: string) {
  return new Date(`${dateStr}T${timeHHMM}:00Z`);
}

const GROUPS_DATA = [
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

type TeamInput = { name: string; flag: string; fifaCode: string };

const TEAMS_DATA: Record<string, TeamInput[]> = {
  A: [
    { name: "Mexico",       flag: "🇲🇽", fifaCode: "MEX" },
    { name: "South Africa", flag: "🇿🇦", fifaCode: "RSA" },
    { name: "South Korea",  flag: "🇰🇷", fifaCode: "KOR" },
    { name: "Czech Republic", flag: "🇨🇿", fifaCode: "CZE" },
  ],
  B: [
    { name: "Canada",      flag: "🇨🇦", fifaCode: "CAN" },
    { name: "Switzerland", flag: "🇨🇭", fifaCode: "SUI" },
    { name: "Qatar",       flag: "🇶🇦", fifaCode: "QAT" },
    { name: "Bosnia and Herzegovina", flag: "🇧🇦", fifaCode: "BIH" },
  ],
  C: [
    { name: "Brazil",   flag: "🇧🇷", fifaCode: "BRA" },
    { name: "Morocco",  flag: "🇲🇦", fifaCode: "MAR" },
    { name: "Haiti",    flag: "🇭🇹", fifaCode: "HAI" },
    { name: "Scotland", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", fifaCode: "SCO" },
  ],
  D: [
    { name: "USA",       flag: "🇺🇸", fifaCode: "USA" },
    { name: "Paraguay",  flag: "🇵🇾", fifaCode: "PAR" },
    { name: "Australia", flag: "🇦🇺", fifaCode: "AUS" },
    { name: "Turkey", flag: "🇹🇷", fifaCode: "TUR" },
  ],
  E: [
    { name: "Germany",     flag: "🇩🇪", fifaCode: "GER" },
    { name: "Curaçao",     flag: "🇨🇼", fifaCode: "CUW" },
    { name: "Ivory Coast", flag: "🇨🇮", fifaCode: "CIV" },
    { name: "Ecuador",     flag: "🇪🇨", fifaCode: "ECU" },
  ],
  F: [
    { name: "Netherlands", flag: "🇳🇱", fifaCode: "NED" },
    { name: "Japan",       flag: "🇯🇵", fifaCode: "JPN" },
    { name: "Tunisia",     flag: "🇹🇳", fifaCode: "TUN" },
    { name: "Sweden",   flag: "🇸🇪", fifaCode: "SWE" },
  ],
  G: [
    { name: "Belgium",     flag: "🇧🇪", fifaCode: "BEL" },
    { name: "Egypt",       flag: "🇪🇬", fifaCode: "EGY" },
    { name: "Iran",        flag: "🇮🇷", fifaCode: "IRN" },
    { name: "New Zealand", flag: "🇳🇿", fifaCode: "NZL" },
  ],
  H: [
    { name: "Spain",        flag: "🇪🇸", fifaCode: "ESP" },
    { name: "Cape Verde",   flag: "🇨🇻", fifaCode: "CPV" },
    { name: "Saudi Arabia", flag: "🇸🇦", fifaCode: "KSA" },
    { name: "Uruguay",      flag: "🇺🇾", fifaCode: "URU" },
  ],
  I: [
    { name: "France",  flag: "🇫🇷", fifaCode: "FRA" },
    { name: "Senegal", flag: "🇸🇳", fifaCode: "SEN" },
    { name: "Norway",  flag: "🇳🇴", fifaCode: "NOR" },
    { name: "Iraq", flag: "🇮🇶", fifaCode: "IRQ" },
  ],
  J: [
    { name: "Argentina", flag: "🇦🇷", fifaCode: "ARG" },
    { name: "Algeria",   flag: "🇩🇿", fifaCode: "ALG" },
    { name: "Austria",   flag: "🇦🇹", fifaCode: "AUT" },
    { name: "Jordan",    flag: "🇯🇴", fifaCode: "JOR" },
  ],
  K: [
    { name: "Portugal",   flag: "🇵🇹", fifaCode: "POR" },
    { name: "Colombia",   flag: "🇨🇴", fifaCode: "COL" },
    { name: "Uzbekistan", flag: "🇺🇿", fifaCode: "UZB" },
    { name: "IC PO-1",    flag: "🏳️", fifaCode: "ICP1" },
  ],
  L: [
    { name: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", fifaCode: "ENG" },
    { name: "Croatia", flag: "🇭🇷", fifaCode: "CRO" },
    { name: "Ghana",   flag: "🇬🇭", fifaCode: "GHA" },
    { name: "Panama",  flag: "🇵🇦", fifaCode: "PAN" },
  ],
};

// Each group match entry: grp=letter, t1/t2=team index 0-3, date/time UTC, venue, matchNum
// Pattern per group: MD1: [0v1, 2v3], MD2: [0v2, 1v3], MD3(sim): [0v3, 1v2]
type MatchEntry = {
  grp: string; t1: number; t2: number;
  date: string; time: string; venue: string; matchNum: number;
};

const GROUP_MATCHES: MatchEntry[] = [
  // Group A (Mexico=0, South Africa=1, South Korea=2, PO-D=3)
  { grp:"A", t1:0, t2:1, date:"2026-06-11", time:"19:00", venue:"Estadio Azteca, Mexico City",           matchNum:1  },
  { grp:"A", t1:2, t2:3, date:"2026-06-12", time:"02:00", venue:"Estadio Akron, Guadalajara",             matchNum:2  },
  { grp:"A", t1:3, t2:1, date:"2026-06-18", time:"16:00", venue:"Mercedes-Benz Stadium, Atlanta",         matchNum:25 },
  { grp:"A", t1:0, t2:2, date:"2026-06-19", time:"01:00", venue:"Estadio Akron, Guadalajara",             matchNum:26 },
  { grp:"A", t1:0, t2:3, date:"2026-06-25", time:"23:00", venue:"Estadio Azteca, Mexico City",            matchNum:49 },
  { grp:"A", t1:1, t2:2, date:"2026-06-25", time:"23:00", venue:"Estadio BBVA, Monterrey",                matchNum:50 },
  // Group B (Canada=0, Switzerland=1, Qatar=2, PO-A=3)
  { grp:"B", t1:0, t2:3, date:"2026-06-12", time:"16:00", venue:"BMO Field, Toronto",                     matchNum:3  },
  { grp:"B", t1:1, t2:2, date:"2026-06-12", time:"19:00", venue:"Lumen Field, Seattle",                   matchNum:4  },
  { grp:"B", t1:2, t2:0, date:"2026-06-19", time:"16:00", venue:"Hard Rock Stadium, Miami",               matchNum:27 },
  { grp:"B", t1:1, t2:3, date:"2026-06-19", time:"22:00", venue:"MetLife Stadium, East Rutherford",       matchNum:28 },
  { grp:"B", t1:1, t2:0, date:"2026-06-26", time:"01:00", venue:"BC Place, Vancouver",                    matchNum:51 },
  { grp:"B", t1:2, t2:3, date:"2026-06-26", time:"01:00", venue:"Arrowhead Stadium, Kansas City",         matchNum:52 },
  // Group C (Brazil=0, Morocco=1, Haiti=2, Scotland=3)
  { grp:"C", t1:0, t2:3, date:"2026-06-12", time:"22:00", venue:"Hard Rock Stadium, Miami",               matchNum:5  },
  { grp:"C", t1:1, t2:2, date:"2026-06-13", time:"22:00", venue:"Mercedes-Benz Stadium, Atlanta",         matchNum:6  },
  { grp:"C", t1:2, t2:3, date:"2026-06-20", time:"16:00", venue:"Arrowhead Stadium, Kansas City",         matchNum:29 },
  { grp:"C", t1:0, t2:1, date:"2026-06-20", time:"19:00", venue:"SoFi Stadium, Los Angeles",              matchNum:30 },
  { grp:"C", t1:0, t2:2, date:"2026-06-26", time:"22:00", venue:"Mercedes-Benz Stadium, Atlanta",         matchNum:53 },
  { grp:"C", t1:1, t2:3, date:"2026-06-26", time:"22:00", venue:"Hard Rock Stadium, Miami",               matchNum:54 },
  // Group D (USA=0, Paraguay=1, Australia=2, PO-C=3)
  { grp:"D", t1:0, t2:1, date:"2026-06-13", time:"01:00", venue:"SoFi Stadium, Los Angeles",              matchNum:7  },
  { grp:"D", t1:2, t2:3, date:"2026-06-13", time:"16:00", venue:"Estadio BBVA, Monterrey",                matchNum:8  },
  { grp:"D", t1:0, t2:2, date:"2026-06-19", time:"19:00", venue:"Lumen Field, Seattle",                   matchNum:31 },
  { grp:"D", t1:1, t2:3, date:"2026-06-20", time:"01:00", venue:"Estadio BBVA, Monterrey",                matchNum:32 },
  { grp:"D", t1:0, t2:3, date:"2026-06-25", time:"19:00", venue:"SoFi Stadium, Los Angeles",              matchNum:55 },
  { grp:"D", t1:2, t2:1, date:"2026-06-25", time:"19:00", venue:"Levi's Stadium, San Francisco",          matchNum:56 },
  // Group E (Germany=0, Curaçao=1, Ivory Coast=2, Ecuador=3)
  { grp:"E", t1:0, t2:1, date:"2026-06-13", time:"16:00", venue:"Arrowhead Stadium, Kansas City",         matchNum:9  },
  { grp:"E", t1:2, t2:3, date:"2026-06-13", time:"19:00", venue:"Levi's Stadium, San Francisco",          matchNum:10 },
  { grp:"E", t1:0, t2:2, date:"2026-06-21", time:"16:00", venue:"Hard Rock Stadium, Miami",               matchNum:33 },
  { grp:"E", t1:1, t2:3, date:"2026-06-21", time:"19:00", venue:"Gillette Stadium, Boston",               matchNum:34 },
  { grp:"E", t1:0, t2:3, date:"2026-06-26", time:"19:00", venue:"Mercedes-Benz Stadium, Atlanta",         matchNum:57 },
  { grp:"E", t1:1, t2:2, date:"2026-06-26", time:"19:00", venue:"Hard Rock Stadium, Miami",               matchNum:58 },
  // Group F (Netherlands=0, Japan=1, Tunisia=2, PO-B=3)
  { grp:"F", t1:0, t2:3, date:"2026-06-14", time:"01:00", venue:"AT&T Stadium, Dallas",                   matchNum:11 },
  { grp:"F", t1:1, t2:2, date:"2026-06-14", time:"16:00", venue:"BC Place, Vancouver",                    matchNum:12 },
  { grp:"F", t1:3, t2:0, date:"2026-06-21", time:"01:00", venue:"Lincoln Financial Field, Philadelphia",  matchNum:35 },
  { grp:"F", t1:1, t2:3, date:"2026-06-21", time:"16:00", venue:"Estadio Azteca, Mexico City",            matchNum:36 },
  { grp:"F", t1:0, t2:2, date:"2026-06-26", time:"02:00", venue:"Estadio Akron, Guadalajara",             matchNum:59 },
  { grp:"F", t1:3, t2:1, date:"2026-06-26", time:"02:00", venue:"Estadio BBVA, Monterrey",                matchNum:60 },
  // Group G (Belgium=0, Egypt=1, Iran=2, New Zealand=3)
  { grp:"G", t1:0, t2:1, date:"2026-06-14", time:"19:00", venue:"SoFi Stadium, Los Angeles",              matchNum:13 },
  { grp:"G", t1:2, t2:3, date:"2026-06-14", time:"22:00", venue:"Gillette Stadium, Boston",               matchNum:14 },
  { grp:"G", t1:0, t2:2, date:"2026-06-21", time:"22:00", venue:"BMO Field, Toronto",                     matchNum:37 },
  { grp:"G", t1:1, t2:3, date:"2026-06-22", time:"01:00", venue:"AT&T Stadium, Dallas",                   matchNum:38 },
  { grp:"G", t1:0, t2:3, date:"2026-06-27", time:"19:00", venue:"Lumen Field, Seattle",                   matchNum:61 },
  { grp:"G", t1:2, t2:1, date:"2026-06-27", time:"19:00", venue:"Arrowhead Stadium, Kansas City",         matchNum:62 },
  // Group H (Spain=0, Cape Verde=1, Saudi Arabia=2, Uruguay=3)
  { grp:"H", t1:0, t2:1, date:"2026-06-15", time:"01:00", venue:"Hard Rock Stadium, Miami",               matchNum:15 },
  { grp:"H", t1:2, t2:3, date:"2026-06-15", time:"16:00", venue:"MetLife Stadium, East Rutherford",       matchNum:16 },
  { grp:"H", t1:0, t2:2, date:"2026-06-22", time:"16:00", venue:"NRG Stadium, Houston",                   matchNum:39 },
  { grp:"H", t1:1, t2:3, date:"2026-06-22", time:"19:00", venue:"Lumen Field, Seattle",                   matchNum:40 },
  { grp:"H", t1:0, t2:3, date:"2026-06-27", time:"23:00", venue:"SoFi Stadium, Los Angeles",              matchNum:63 },
  { grp:"H", t1:1, t2:2, date:"2026-06-27", time:"23:00", venue:"Levi's Stadium, San Francisco",          matchNum:64 },
  // Group I (France=0, Senegal=1, Norway=2, PO-2=3)
  { grp:"I", t1:0, t2:1, date:"2026-06-15", time:"19:00", venue:"Levi's Stadium, San Francisco",          matchNum:17 },
  { grp:"I", t1:2, t2:3, date:"2026-06-15", time:"22:00", venue:"Lincoln Financial Field, Philadelphia",  matchNum:18 },
  { grp:"I", t1:0, t2:2, date:"2026-06-22", time:"22:00", venue:"BC Place, Vancouver",                    matchNum:41 },
  { grp:"I", t1:1, t2:3, date:"2026-06-23", time:"01:00", venue:"Estadio BBVA, Monterrey",                matchNum:42 },
  { grp:"I", t1:0, t2:3, date:"2026-06-28", time:"02:00", venue:"Estadio Azteca, Mexico City",            matchNum:65 },
  { grp:"I", t1:1, t2:2, date:"2026-06-28", time:"02:00", venue:"Estadio BBVA, Monterrey",                matchNum:66 },
  // Group J (Argentina=0, Algeria=1, Austria=2, Jordan=3)
  { grp:"J", t1:0, t2:1, date:"2026-06-16", time:"01:00", venue:"Estadio BBVA, Monterrey",                matchNum:19 },
  { grp:"J", t1:2, t2:3, date:"2026-06-16", time:"16:00", venue:"Lumen Field, Seattle",                   matchNum:20 },
  { grp:"J", t1:0, t2:2, date:"2026-06-23", time:"16:00", venue:"NRG Stadium, Houston",                   matchNum:43 },
  { grp:"J", t1:1, t2:3, date:"2026-06-23", time:"19:00", venue:"Estadio Azteca, Mexico City",            matchNum:44 },
  { grp:"J", t1:0, t2:3, date:"2026-06-28", time:"19:00", venue:"Hard Rock Stadium, Miami",               matchNum:67 },
  { grp:"J", t1:1, t2:2, date:"2026-06-28", time:"19:00", venue:"SoFi Stadium, Los Angeles",              matchNum:68 },
  // Group K (Portugal=0, Colombia=1, Uzbekistan=2, PO-1=3)
  { grp:"K", t1:0, t2:1, date:"2026-06-16", time:"19:00", venue:"NRG Stadium, Houston",                   matchNum:21 },
  { grp:"K", t1:2, t2:3, date:"2026-06-16", time:"22:00", venue:"Estadio Akron, Guadalajara",             matchNum:22 },
  { grp:"K", t1:0, t2:2, date:"2026-06-23", time:"22:00", venue:"Levi's Stadium, San Francisco",          matchNum:45 },
  { grp:"K", t1:1, t2:3, date:"2026-06-24", time:"01:00", venue:"MetLife Stadium, East Rutherford",       matchNum:46 },
  { grp:"K", t1:0, t2:3, date:"2026-06-29", time:"02:00", venue:"NRG Stadium, Houston",                   matchNum:69 },
  { grp:"K", t1:1, t2:2, date:"2026-06-29", time:"02:00", venue:"Levi's Stadium, San Francisco",          matchNum:70 },
  // Group L (England=0, Croatia=1, Ghana=2, Panama=3)
  { grp:"L", t1:0, t2:1, date:"2026-06-17", time:"01:00", venue:"AT&T Stadium, Dallas",                   matchNum:23 },
  { grp:"L", t1:2, t2:3, date:"2026-06-17", time:"16:00", venue:"Arrowhead Stadium, Kansas City",         matchNum:24 },
  { grp:"L", t1:0, t2:2, date:"2026-06-24", time:"16:00", venue:"Lincoln Financial Field, Philadelphia",  matchNum:47 },
  { grp:"L", t1:1, t2:3, date:"2026-06-24", time:"20:00", venue:"Levi's Stadium, San Francisco",          matchNum:48 },
  { grp:"L", t1:0, t2:3, date:"2026-06-29", time:"02:00", venue:"Estadio BBVA, Monterrey",                matchNum:71 },
  { grp:"L", t1:1, t2:2, date:"2026-06-29", time:"02:00", venue:"BMO Field, Toronto",                     matchNum:72 },
];

// Round of 32 bracket – Wikipedia confirmed
type R32Entry = { matchNum: number; home: string; away: string; date: string; time: string; venue: string };

const R32_MATCHES: R32Entry[] = [
  { matchNum:73, home:"Runner-up Group A",  away:"Runner-up Group B",      date:"2026-06-28", time:"23:00", venue:"SoFi Stadium, Los Angeles"                   },
  { matchNum:74, home:"Winner Group E",     away:"Best 3rd (A/B/C/D/F)",   date:"2026-06-29", time:"19:00", venue:"Gillette Stadium, Boston"                    },
  { matchNum:75, home:"Winner Group F",     away:"Runner-up Group C",       date:"2026-06-29", time:"23:00", venue:"AT&T Stadium, Dallas"                        },
  { matchNum:76, home:"Winner Group C",     away:"Runner-up Group F",       date:"2026-06-30", time:"00:00", venue:"NRG Stadium, Houston"                        },
  { matchNum:77, home:"Winner Group I",     away:"Best 3rd (C/D/F/G/H)",   date:"2026-06-30", time:"19:00", venue:"Levi's Stadium, San Francisco"               },
  { matchNum:78, home:"Runner-up Group E",  away:"Runner-up Group I",       date:"2026-06-30", time:"23:00", venue:"Estadio Akron, Guadalajara"                  },
  { matchNum:79, home:"Winner Group A",     away:"Best 3rd (C/E/F/H/I)",   date:"2026-07-01", time:"19:00", venue:"Estadio Azteca, Mexico City"                 },
  { matchNum:80, home:"Winner Group L",     away:"Best 3rd (E/H/I/J/K)",   date:"2026-07-01", time:"23:00", venue:"MetLife Stadium, East Rutherford"            },
  { matchNum:81, home:"Winner Group D",     away:"Best 3rd (B/E/F/I/J)",   date:"2026-07-02", time:"00:00", venue:"Lincoln Financial Field, Philadelphia"       },
  { matchNum:82, home:"Winner Group G",     away:"Best 3rd (A/E/H/I/J)",   date:"2026-07-02", time:"19:00", venue:"Arrowhead Stadium, Kansas City"              },
  { matchNum:83, home:"Runner-up Group K",  away:"Runner-up Group L",       date:"2026-07-02", time:"23:00", venue:"Lumen Field, Seattle"                        },
  { matchNum:84, home:"Winner Group H",     away:"Runner-up Group J",       date:"2026-07-03", time:"00:00", venue:"Hard Rock Stadium, Miami"                    },
  { matchNum:85, home:"Winner Group B",     away:"Best 3rd (E/F/G/I/J)",   date:"2026-07-03", time:"19:00", venue:"BMO Field, Toronto"                          },
  { matchNum:86, home:"Winner Group J",     away:"Runner-up Group H",       date:"2026-07-03", time:"23:00", venue:"Estadio BBVA, Monterrey"                     },
  { matchNum:87, home:"Winner Group K",     away:"Best 3rd (D/E/I/J/L)",   date:"2026-07-04", time:"00:00", venue:"BC Place, Vancouver"                         },
  { matchNum:88, home:"Runner-up Group D",  away:"Runner-up Group G",       date:"2026-07-04", time:"19:00", venue:"Mercedes-Benz Stadium, Atlanta"              },
];

const R16_MATCHES: R32Entry[] = [
  { matchNum:89, home:"Winner Match 74", away:"Winner Match 77", date:"2026-07-04", time:"18:00", venue:"Lincoln Financial Field, Philadelphia" },
  { matchNum:90, home:"Winner Match 73", away:"Winner Match 75", date:"2026-07-04", time:"21:00", venue:"NRG Stadium, Houston"                  },
  { matchNum:91, home:"Winner Match 76", away:"Winner Match 78", date:"2026-07-05", time:"18:00", venue:"MetLife Stadium, East Rutherford"      },
  { matchNum:92, home:"Winner Match 79", away:"Winner Match 80", date:"2026-07-05", time:"21:00", venue:"Estadio Azteca, Mexico City"           },
  { matchNum:93, home:"Winner Match 83", away:"Winner Match 84", date:"2026-07-06", time:"18:00", venue:"AT&T Stadium, Dallas"                  },
  { matchNum:94, home:"Winner Match 81", away:"Winner Match 82", date:"2026-07-06", time:"21:00", venue:"Lumen Field, Seattle"                  },
  { matchNum:95, home:"Winner Match 86", away:"Winner Match 88", date:"2026-07-07", time:"18:00", venue:"Mercedes-Benz Stadium, Atlanta"        },
  { matchNum:96, home:"Winner Match 85", away:"Winner Match 87", date:"2026-07-07", time:"21:00", venue:"BC Place, Vancouver"                   },
];

const QUARTER_MATCHES: R32Entry[] = [
  { matchNum:97, home:"Winner Match 89", away:"Winner Match 90", date:"2026-07-09", time:"20:00", venue:"Gillette Stadium, Boston"              },
  { matchNum:98, home:"Winner Match 93", away:"Winner Match 94", date:"2026-07-10", time:"20:00", venue:"SoFi Stadium, Los Angeles"             },
  { matchNum:99, home:"Winner Match 91", away:"Winner Match 92", date:"2026-07-11", time:"18:00", venue:"Hard Rock Stadium, Miami"              },
  { matchNum:100, home:"Winner Match 95", away:"Winner Match 96", date:"2026-07-11", time:"21:00", venue:"Arrowhead Stadium, Kansas City"       },
];

const SEMI_MATCHES: R32Entry[] = [
  { matchNum:101, home:"Winner Match 97", away:"Winner Match 98",  date:"2026-07-14", time:"20:00", venue:"AT&T Stadium, Dallas"               },
  { matchNum:102, home:"Winner Match 99", away:"Winner Match 100", date:"2026-07-15", time:"20:00", venue:"Mercedes-Benz Stadium, Atlanta"     },
];

const FINAL_MATCHES: R32Entry[] = [
  { matchNum:103, home:"Loser Match 101",  away:"Loser Match 102",  date:"2026-07-18", time:"20:00", venue:"Hard Rock Stadium, Miami"           },
  { matchNum:104, home:"Winner Match 101", away:"Winner Match 102", date:"2026-07-19", time:"20:00", venue:"MetLife Stadium, East Rutherford"   },
];


export async function importSchedule(): Promise<{ groups: number; teams: number; groupMatches: number; r32Matches: number }> {
  // 1. Clear existing data
  await db.delete(betsTable);
  await db.delete(bonusBetsTable);
  await db.delete(matchesTable);
  await db.delete(teamsTable);
  await db.delete(groupsTable);

  // 2. Insert groups
  const insertedGroups: (typeof groupsTable.$inferSelect)[] = [];
  for (const g of GROUPS_DATA) {
    const [group] = await db.insert(groupsTable).values(g).returning();
    insertedGroups.push(group);
  }
  const groupByName = (name: string) => insertedGroups.find(g => g.name === name)!;

  // 3. Insert teams
  const insertedTeams: Record<string, (typeof teamsTable.$inferSelect)[]> = {};
  for (const [grpName, teams] of Object.entries(TEAMS_DATA)) {
    const group = groupByName(grpName);
    insertedTeams[grpName] = [];
    for (const t of teams) {
      const [team] = await db.insert(teamsTable).values({
        name: t.name, flag: t.flag, fifaCode: t.fifaCode, groupId: group.id,
      }).returning();
      insertedTeams[grpName].push(team);
    }
  }

  // 4. Insert group stage matches
  for (const m of GROUP_MATCHES) {
    const group = groupByName(m.grp);
    const teams = insertedTeams[m.grp];
    await db.insert(matchesTable).values({
      homeTeamId: teams[m.t1].id,
      awayTeamId: teams[m.t2].id,
      groupId: group.id,
      matchDate: utc(m.date, m.time),
      stage: "group",
      matchNumber: m.matchNum,
      venue: m.venue,
      status: "upcoming",
    });
  }

  // 5. Insert Round of 32 placeholders
  for (const m of R32_MATCHES) {
    await db.insert(matchesTable).values({
      homeTeamId: null,
      awayTeamId: null,
      homePlaceholder: m.home,
      awayPlaceholder: m.away,
      groupId: null,
      matchDate: utc(m.date, m.time),
      stage: "round_of_32",
      matchNumber: m.matchNum,
      venue: m.venue,
      status: "upcoming",
    });
  }

  // 6. Insert Round of 16 placeholders
  for (const m of R16_MATCHES) {
    await db.insert(matchesTable).values({
      homeTeamId: null,
      awayTeamId: null,
      homePlaceholder: m.home,
      awayPlaceholder: m.away,
      groupId: null,
      matchDate: utc(m.date, m.time),
      stage: "round_of_16",
      matchNumber: m.matchNum,
      venue: m.venue,
      status: "upcoming",
    });
  }

  // 7. Insert Quarter-finals placeholders
  for (const m of QUARTER_MATCHES) {
    await db.insert(matchesTable).values({
      homeTeamId: null,
      awayTeamId: null,
      homePlaceholder: m.home,
      awayPlaceholder: m.away,
      groupId: null,
      matchDate: utc(m.date, m.time),
      stage: "quarterfinal",
      matchNumber: m.matchNum,
      venue: m.venue,
      status: "upcoming",
    });
  }

  // 8. Insert Semi-finals placeholders
  for (const m of SEMI_MATCHES) {
    await db.insert(matchesTable).values({
      homeTeamId: null,
      awayTeamId: null,
      homePlaceholder: m.home,
      awayPlaceholder: m.away,
      groupId: null,
      matchDate: utc(m.date, m.time),
      stage: "semifinal",
      matchNumber: m.matchNum,
      venue: m.venue,
      status: "upcoming",
    });
  }

  // 9. Insert Final placeholders
  for (const m of FINAL_MATCHES) {
    await db.insert(matchesTable).values({
      homeTeamId: null,
      awayTeamId: null,
      homePlaceholder: m.home,
      awayPlaceholder: m.away,
      groupId: null,
      matchDate: utc(m.date, m.time),
      stage: m.matchNum === 103 ? "third_place" : "final",
      matchNumber: m.matchNum,
      venue: m.venue,
      status: "upcoming",
    });
  }

  return {
    groups: insertedGroups.length,
    teams: Object.values(insertedTeams).flat().length,
    groupMatches: GROUP_MATCHES.length,
    r32Matches: R32_MATCHES.length,
  };
}
