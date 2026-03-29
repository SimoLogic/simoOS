const fs = require('fs');
const { Client } = require('pg');

const dbUrl = "postgresql://postgres.eezzumwlucfidzyppllj:Getcom2021*@aws-1-us-east-1.pooler.supabase.com:5432/postgres";
const sqlFile = "sql/consolidated_logic.sql";

const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log("Connecting to Supabase...");
        await client.connect();
        console.log("Connected successfully.");

        console.log(`Reading SQL file: ${sqlFile}`);
        const sql = fs.readFileSync(sqlFile, 'utf8');

        console.log("Executing SQL...");
        await client.query(sql);
        console.log("SQL executed successfully. Triggers and Functions injected.");
        
        // Delete password file automatically
        fs.unlinkSync('db_pass.txt');
        console.log('db_pass.txt deleted securely.');

    } catch (err) {
        console.error("Error executing SQL:", err);
        process.exitCode = 1;
    } finally {
        await client.end();
    }
}

run();
