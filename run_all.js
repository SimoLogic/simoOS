const fs = require('fs');
const { execSync } = require('child_process');
const { Client } = require('pg');

async function main() {
    try {
        let url = fs.readFileSync('.working_url', 'utf8').trim();
        console.log("Read valid connection string securely.");

        // 0. Pre-push quick fix for index constraint locks
        console.log("\n--- Fixing Prisma Constraint Drop Lock ---");
        const initClient = new Client({
            connectionString: url,
            ssl: { rejectUnauthorized: false }
        });
        await initClient.connect();
        await initClient.query('ALTER TABLE IF EXISTS hr_employees DROP CONSTRAINT IF EXISTS hr_employees_email_key CASCADE;');
        await initClient.query('ALTER TABLE IF EXISTS hr_employees DROP CONSTRAINT IF EXISTS hr_employees_eid_key CASCADE;');
        await initClient.end();

        // 1. Prisma DB Push
        console.log("\n--- Starting Prisma DB Push ---");
        // Ensure the password has URL encoded asterisk for Prisma engine
        const prismaUrl = url.replace('Getcom2021*', 'Getcom2021%2A');
        process.env.DATABASE_URL = prismaUrl;
        
        execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit', env: process.env });
        console.log("Prisma DB Push completed successfully.");

        // 2. Inject SQL Native Logic
        console.log("\n--- Injecting Native SQL Logic ---");
        const client = new Client({
            connectionString: url,
            ssl: { rejectUnauthorized: false }
        });
        await client.connect();
        
        const sql = fs.readFileSync('sql/consolidated_logic.sql', 'utf8');
        await client.query(sql);
        console.log("SQL injected successfully.");
        await client.end();

        // 3. Seed Execution
        console.log("\n--- Executing Database Seed ---");
        execSync('npx tsx scripts/seed-total.ts', { stdio: 'inherit', env: process.env });
        console.log("Seed execution complete.");

        // 4. Cleanup
        console.log("\n--- Cleaning up secure files ---");
        if (fs.existsSync('db_pass.txt')) fs.unlinkSync('db_pass.txt');
        if (fs.existsSync('.working_url')) fs.unlinkSync('.working_url');
        console.log("Cleanup complete. The system is 1:1.");
        
    } catch (err) {
        console.error("Migration Pipeline Failed:", err);
        process.exit(1);
    }
}

main();
