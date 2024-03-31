const fs = require('fs');
const readline = require('readline');
const Excel = require('exceljs');

const logDirectory = './promo-logs'; // Replace with your log directory path
const outputExcelFile = 'promo-output.xlsx';

// Function to process log file
const processLogFile = async (filePath) => {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    });

    const dataMap = new Map();

    for await (const line of rl) {
        let txnId;

        if (line.includes('TXN ID: ')) {
            const txnIdMatch = line.match(/TXN ID: ([\w-]+)/);
            if (txnIdMatch && txnIdMatch[1]) {
                txnId = txnIdMatch[1];
                // console.log(`TXN_ID: ${txnId}`);
            }
        }
        if (line.includes('Received message from kafka')) {
            console.log(dataMap.has(txnId), txnId);
            const message = JSON.parse(line.split('Received message from kafka: ')[1]);
            txnId = message.clientTxnId;
            if (txnId && !dataMap.has(txnId)) {
                console.log(`TXN_ID: ${txnId}`, `dataMap: ${dataMap}`);
                dataMap.set(txnId, { clientId: message.clientId, campaignId: message.campaignId, records: [] });
            }
        } else if (line.includes('AnsIptspPstnRequestDto') && txnId) {
            const requestDto = JSON.parse(line.split('AnsIptspPstnRequestDto: ')[1]);
            const data = dataMap.get(txnId);
            // console.log(dataMap.get(txnId));
            if (data) {
                data.records.push({ msisdn: requestDto.msisdn, rn_code: requestDto.rn_code, type: requestDto.type });
            }
        }
    }
    console.log(dataMap);
    return dataMap;
};

// Function to write data to Excel
// const writeToExcel = async (dataMap) => {
//     const workbook = new Excel.Workbook();

//     for (const [txnId, data] of dataMap.entries()) {
//         console.log(`Writing data for TXN_ID: ${txnId}`, data); // Log data for each transaction ID
//         const worksheet = workbook.addWorksheet(`TXN_ID_${txnId}`);
//         worksheet.columns = [
//             { header: 'Client ID', key: 'clientId', width: 15 },
//             { header: 'Campaign ID', key: 'campaignId', width: 20 },
//             { header: 'MSISDN', key: 'msisdn', width: 20 },
//             { header: 'RN Code', key: 'rn_code', width: 10 },
//             { header: 'Type', key: 'type', width: 10 }
//         ];

//         if (data.records.length === 0) {
//             console.log(`No records found for TXN_ID: ${txnId}`); // Log if no records are found for a transaction
//         }

//         data.records.forEach(record => {
//             console.log(`Adding row for TXN_ID: ${txnId}`, record); // Log each record being added
//             worksheet.addRow({ clientId: data.clientId, campaignId: data.campaignId, ...record });
//         });
//     }

//     await workbook.xlsx.writeFile(outputExcelFile);
//     console.log(`Data has been written to ${outputExcelFile}`);
// };


const writeToExcel = async (dataMap) => {
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet('All Transactions');
    worksheet.columns = [
        { header: 'TXN ID', key: 'txnId', width: 20 },
        { header: 'Client ID', key: 'clientId', width: 15 },
        { header: 'Campaign ID', key: 'campaignId', width: 20 },
        { header: 'MSISDN', key: 'msisdn', width: 20 },
        { header: 'RN Code', key: 'rn_code', width: 10 },
        { header: 'Type', key: 'type', width: 10 }
    ];

    for (const [txnId, data] of dataMap.entries()) {
        console.log(`Writing data for TXN_ID: ${txnId}`, data); // Log data for each transaction ID
        if (data.records.length === 0) {
            console.log(`No records found for TXN_ID: ${txnId}`); // Log if no records are found for a transaction
            // Optionally add a row for transactions with no records
            worksheet.addRow({ txnId, clientId: data.clientId, campaignId: data.campaignId });
        }
        data.records.forEach(record => {
            console.log(`Adding row for TXN_ID: ${txnId}`, record); // Log each record being added
            worksheet.addRow({ txnId, clientId: data.clientId, campaignId: data.campaignId, ...record });
        });
    }

    await workbook.xlsx.writeFile(outputExcelFile);
    console.log(`Data has been written to ${outputExcelFile}`);
};


// Main function to process all log files and write to Excel
const processLogsAndWriteToExcel = async () => {
    const allDataMap = new Map();

    const files = fs.readdirSync(logDirectory);
    for (const file of files) {
        if (file.endsWith('.log')) {
            const filePath = `${logDirectory}/${file}`;
            console.log(`Processing file: ${filePath}`);
            const dataMap = await processLogFile(filePath);
            // Combine data from all files
            for (const [txnId, data] of dataMap.entries()) {
                if (!allDataMap.has(txnId)) {
                    allDataMap.set(txnId, data);
                } else {
                    allDataMap.get(txnId).records.push(...data.records);
                }
            }
        }
    }

    await writeToExcel(allDataMap);
    console.log(`Data has been written to ${outputExcelFile}`);
};

processLogsAndWriteToExcel().catch(console.error);