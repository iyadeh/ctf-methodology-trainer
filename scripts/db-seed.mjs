import { resolve } from "node:path";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  frameworkChecks,
  frameworkPhases,
  frameworks,
} from "../src/lib/db/schema.ts";
import { ptesFramework } from "../src/modules/methodology/ptes.ts";

config({ path: resolve(process.cwd(), ".env.local"), quiet: true });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed the PTES framework.");
}

const client = postgres(databaseUrl, { connect_timeout: 5, max: 1 });
const database = drizzle(client);

async function seedPtes() {
  await database.transaction(async (transaction) => {
    const [framework] = await transaction
      .insert(frameworks)
      .values({
        slug: ptesFramework.slug,
        name: ptesFramework.name,
        version: ptesFramework.version,
        description: ptesFramework.description,
      })
      .onConflictDoUpdate({
        target: frameworks.slug,
        set: {
          name: ptesFramework.name,
          description: ptesFramework.description,
          updatedAt: new Date(),
        },
      })
      .returning({ id: frameworks.id, version: frameworks.version });

    if (framework.version !== ptesFramework.version) {
      throw new Error(
        `Framework ${ptesFramework.slug} has version ${framework.version}; expected ${ptesFramework.version}.`,
      );
    }

    for (const phase of ptesFramework.phases) {
      const [storedPhase] = await transaction
        .insert(frameworkPhases)
        .values({
          frameworkId: framework.id,
          semanticKey: phase.semanticKey,
          name: phase.name,
          sortOrder: phase.sortOrder,
        })
        .onConflictDoUpdate({
          target: [frameworkPhases.frameworkId, frameworkPhases.semanticKey],
          set: {
            name: phase.name,
            sortOrder: phase.sortOrder,
            updatedAt: new Date(),
          },
        })
        .returning({ id: frameworkPhases.id });

      for (const check of phase.checks) {
        await transaction
          .insert(frameworkChecks)
          .values({
            frameworkPhaseId: storedPhase.id,
            semanticKey: check.semanticKey,
            title: check.title,
            priority: check.priority,
            sortOrder: check.sortOrder,
          })
          .onConflictDoUpdate({
            target: [frameworkChecks.frameworkPhaseId, frameworkChecks.semanticKey],
            set: {
              title: check.title,
              priority: check.priority,
              sortOrder: check.sortOrder,
              updatedAt: new Date(),
            },
          });
      }
    }
  });
}

async function verifyPtes() {
  const matchingFrameworks = await database
    .select()
    .from(frameworks)
    .where(eq(frameworks.slug, ptesFramework.slug));

  if (
    matchingFrameworks.length !== 1 ||
    matchingFrameworks[0].version !== ptesFramework.version
  ) {
    throw new Error("PTES framework verification failed.");
  }

  const storedPhases = await database
    .select()
    .from(frameworkPhases)
    .where(eq(frameworkPhases.frameworkId, matchingFrameworks[0].id));

  if (storedPhases.length !== ptesFramework.phases.length) {
    throw new Error(`Expected ${ptesFramework.phases.length} PTES phases.`);
  }

  const counts = [];

  for (const phase of ptesFramework.phases) {
    const storedPhase = storedPhases.find(
      (candidate) => candidate.semanticKey === phase.semanticKey,
    );

    if (
      !storedPhase ||
      storedPhase.name !== phase.name ||
      storedPhase.sortOrder !== phase.sortOrder
    ) {
      throw new Error(`PTES phase ${phase.semanticKey} does not match its definition.`);
    }

    const storedChecks = await database
      .select()
      .from(frameworkChecks)
      .where(eq(frameworkChecks.frameworkPhaseId, storedPhase.id));

    if (storedChecks.length !== phase.checks.length) {
      throw new Error(`PTES phase ${phase.semanticKey} has unexpected check count.`);
    }

    for (const check of phase.checks) {
      const storedCheck = storedChecks.find(
        (candidate) => candidate.semanticKey === check.semanticKey,
      );

      if (
        !storedCheck ||
        storedCheck.title !== check.title ||
        storedCheck.priority !== check.priority ||
        storedCheck.sortOrder !== check.sortOrder
      ) {
        throw new Error(`PTES check ${check.semanticKey} does not match its definition.`);
      }
    }

    counts.push(`${phase.semanticKey}: ${storedChecks.length}`);
  }

  console.log(
    `Verified ${ptesFramework.slug} v${ptesFramework.version}: ${storedPhases.length} phases, ${counts.join(", ")}.`,
  );
}

try {
  await seedPtes();
  await verifyPtes();
} finally {
  await client.end({ timeout: 5 });
}
