const fs = require('fs');
const { Client } = require('pg');

const urls = [
    "postgresql://postgres.eezzumwlucfidzyppllj:Getcom2021*@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
    "postgresql://postgres.eezzumwlucfidzyppllj:Getcom2021*@aws-0-us-east-1.pooler.supabase.com:5432/postgres",
    "postgresql://postgres:Getcom2021*@db.eezzumwlucfidzyppllj.supabase.co:5432/postgres",
    "postgresql://postgres:Getcom2021%2A@db.eezzumwlucfidzyppllj.supabase.co:5432/postgres" // Direct format URL encoded
];

async function testConnection(url) {
    const client = new Client({
        connectionString: url,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();
        console.log("SUCCESS: Connected");
        await client.end();
        return true;
    } catch (err) {
        console.error(`FAILED: ${err.message}`);
        await client.end();
        return false;
    }
}

async function runTests() {
    for (const url of urls) {
        const success = await testConnection(url);
        if (success) {
            console.log("Found working URL!");
            fs.writeFileSync('.working_url', url); // Save for next step
            process.exit(0);
        }
    }
    console.log("All URLs failed.");
    process.exit(1);
}

runTests();
