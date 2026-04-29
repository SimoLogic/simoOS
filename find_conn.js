const fs = require('fs');
const { Client } = require('pg');

const p1 = "Getcom2021*";
const p2 = "Getcom2021%2A";

const urls = [
    `postgresql://postgres.eezzumwlucfidzyppllj:${p1}@aws-1-us-east-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres.eezzumwlucfidzyppllj:${p2}@aws-1-us-east-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres:${p1}@aws-1-us-east-1.pooler.supabase.com:5432/postgres`,
    `postgresql://postgres:${p2}@aws-1-us-east-1.pooler.supabase.com:5432/postgres`,
    `postgresql://postgres.eezzumwlucfidzyppllj:${p1}@aws-1-us-east-1.pooler.supabase.com:5432/postgres?pgbouncer=true`,
    `postgresql://postgres.eezzumwlucfidzyppllj:${p2}@aws-1-us-east-1.pooler.supabase.com:5432/postgres`
];

async function testConnection(url) {
    const client = new Client({
        connectionString: url,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();
        const res = await client.query('SELECT 1 as result');
        console.log(`SUCCESS: Connected`);
        await client.end();
        return true;
    } catch (err) {
        console.log(`FAILED: ${err.message}`);
        await client.end();
        return false;
    }
}

async function start() {
    for (const u of urls) {
        const ok = await testConnection(u);
        if (ok) {
            fs.writeFileSync('.working_url', u);
            console.log("Written .working_url");
            process.exit(0);
        }
    }
    console.log("No valid combination found");
    process.exit(1);
}

start();
