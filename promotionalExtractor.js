const fs = require('fs');
const excel4node = require('excel4node');

// Function to parse log line and extract JSON message
function extractJSON(line) {
    const jsonPattern = /{.*}/;
    const match = line.match(jsonPattern);
    if (match) {
        // Replace invalid array assignment with colon to make it a valid JSON
        let jsonString = match[0].replace(/=\[/g, ':[');
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.error('Error parsing JSON', error);
        }
    }
    return null;
}

// Function to read log file and extract data
function processLogFile(logFilePath) {
    const logData = fs.readFileSync(logFilePath, 'utf-8');
    const logLines = logData.split('\n');

    const transactions = {};

    // Parse log lines
    logLines.forEach(line => {
        if (line.includes('TXN ID')) {
            const txnIdMatch = line.match(/TXN ID: ([\w-]+)/);
            if (txnIdMatch) {
                const txnId = txnIdMatch[1];
                const messageData = extractJSON(line);

                if (!transactions[txnId]) {
                    transactions[txnId] = {};
                }

                if (messageData) {
                    transactions[txnId].username = messageData.username;
                    transactions[txnId].cli = messageData.cli;
                    transactions[txnId].message = messageData.message;
                    transactions[txnId].type = messageData.type;
                }
            }
        } else if (line.includes('Received message from kafka')) {
            const messageData = extractJSON(line);
            if (messageData && messageData.clientTxnId) {
                const txnId = messageData.clientTxnId;
                transactions[txnId] = transactions[txnId] || {};
                transactions[txnId].billMsisdn = messageData.billMsisdn;
            }
        }
    });

    return transactions;
}

// Function to create Excel file
function createExcelFile(transactions, outputFilePath) {
    const wb = new excel4node.Workbook();
    const ws = wb.addWorksheet('Sheet 1');

    // Set the headers
    const headers = ['TXN ID', 'Username', 'CLI', 'Message', 'Type', 'BillMsisdn'];
    headers.forEach((header, i) => ws.cell(1, i + 1).string(header));

    // Add the data to the worksheet
    let row = 2;
    for (const txnId in transactions) {
        const txn = transactions[txnId];
        ws.cell(row, 1).string(txnId);
        ws.cell(row, 2).string(txn.username || '');
        ws.cell(row, 3).string(txn.cli || '');
        ws.cell(row, 4).string(txn.message || '');
        ws.cell(row, 5).string(txn.type || '');
        ws.cell(row, 6).string(txn.billMsisdn || '');
        row++;
    }

    // Write to file
    wb.write(outputFilePath);
}

// Main function to process the log and create the Excel file
function main() {
    const logFilePath = './promo-logs/a2p-promo-messaging-iptsp.2024-02-01.proda2ppromotionalserver1.mnpspbd.com.0.log';
    const outputFilePath = 'promo-output.xlsx';

    const transactions = processLogFile(logFilePath);
    createExcelFile(transactions, outputFilePath);
    console.log('Excel file has been created.');
}

main();