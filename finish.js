const fs = require('fs');
const { Client } = require('pg');
const { execSync } = require('child_process');

async function main() {
    console.log("Injecting SQL...");
    const client = new Client({
        host: 'aws-1-us-east-1.pooler.supabase.com',
        user: 'postgres.eezzumwlucfidzyppllj',
        password: 'Getcom2021*',
        database: 'postgres',
        port: 5432,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        await client.connect();
        const sql = fs.readFileSync('sql/consolidated_logic.sql', 'utf8');
        await client.query(sql);
        console.log("SQL Triggers and Functions injected successfully.");
        await client.end();

        console.log("Running seed...");
        process.env.DATABASE_URL = "postgresql://postgres.eezzumwlucfidzyppllj:Getcom2021%2A@aws-1-us-east-1.pooler.supabase.com:5432/postgres?pgbouncer=true";
        execSync('npx tsx scripts/seed-total.ts', { stdio: 'inherit', env: process.env });
        console.log("Seed finished.");

        // Cleanup
        if (fs.existsSync('db_pass.txt')) fs.unlinkSync('db_pass.txt');
        if (fs.existsSync('.working_url')) fs.unlinkSync('.working_url');
        console.log("Cleanup done.");

    } catch (err) {
        console.error("Failed:", err);
        process.exit(1);
    }
}
main();
