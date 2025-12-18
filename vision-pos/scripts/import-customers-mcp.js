const fs = require('fs');
const path = require('path');

const csv = fs.readFileSync(path.join(__dirname, '../db-backup-20251211/customers.csv'), 'utf8');
const lines = csv.split('\n');
const headers = lines[0].split(',');

const batchSize = 50;
const batches = [];
let currentBatch = [];

for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;

  const values = [];
  let current = '';
  let inQuotes = false;

  for (const char of lines[i]) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);

  const sqlValues = values.map((v, idx) => {
    const header = headers[idx];
    if (v === '' || v === 'null') return 'NULL';
    if (v === 't') return 'true';
    if (v === 'f') return 'false';

    // Numeric fields - don't quote
    if (['totalSpent', 'averageOrderValue', 'customerLifetimeValue'].includes(header)) {
      return v || '0';
    }

    // Everything else is a string
    return "'" + v.replace(/'/g, "''") + "'";
  });

  currentBatch.push('(' + sqlValues.join(',') + ')');

  if (currentBatch.length >= batchSize) {
    batches.push(currentBatch);
    currentBatch = [];
  }
}

if (currentBatch.length > 0) {
  batches.push(currentBatch);
}

// Output as JSON array of SQL statements
const sqlStatements = batches.map(batch =>
  'INSERT INTO customers (' + headers.join(',') + ') VALUES ' + batch.join(',\n') + ';'
);

console.log(JSON.stringify(sqlStatements, null, 2));
console.error(`Generated ${sqlStatements.length} batch statements for ${lines.length - 1} records`);
