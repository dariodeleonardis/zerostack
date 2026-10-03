#!/usr/bin/env node
/**
 * Porta il database all'ultima versione dello schema con le migrazioni di Prisma.
 * Gira a ogni deploy (servizio zerostack-migrate) e in CI.
 *
 * I database creati prima delle migrazioni (con `prisma db push`) non hanno la tabella
 * _prisma_migrations: la prima volta si allineano allo schema con db push, che rifiuta
 * qualsiasi modifica che perderebbe dati, e si segnano tutte le migrazioni come già applicate.
 * Da lì in poi vale solo `prisma migrate deploy`.
 */
import { execFileSync } from "child_process";
import { readdirSync, statSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = path.join(root, "prisma", "migrations");

function prisma(...args) {
  execFileSync("npx", ["prisma", ...args], { cwd: root, stdio: "inherit" });
}

async function tableExists(client, name) {
  const rows = await client.$queryRaw`SELECT to_regclass(${`public."${name}"`})::text AS t`;
  return Boolean(rows[0]?.t);
}

const client = new PrismaClient();
let legacy = false;
try {
  legacy = (await tableExists(client, "User")) && !(await tableExists(client, "_prisma_migrations"));
} finally {
  await client.$disconnect();
}

if (legacy) {
  console.log("[migrate] database creato con db push: lo allineo e registro le migrazioni esistenti");
  prisma("db", "push", "--skip-generate");
  const names = readdirSync(migrationsDir)
    .filter((d) => statSync(path.join(migrationsDir, d)).isDirectory())
    .sort();
  for (const name of names) prisma("migrate", "resolve", "--applied", name);
}

prisma("migrate", "deploy");
console.log("[migrate] schema aggiornato");
