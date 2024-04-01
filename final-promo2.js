const fs = require('fs');
const readline = require('readline');
const Excel = require('exceljs');

const logDirectory = './promo-logs'; // Replace with your log directory path
const outputExcelFile = 'promo-output2.xlsx';

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
            // console.log(dataMap.has(txnId), txnId);
            const message = JSON.parse(line.split('Received message from kafka: ')[1]);
            txnId = message.clientTxnId;
            if (txnId && !dataMap.has(txnId)) {
                // console.log(`TXN_ID: ${txnId}`, `dataMap: ${dataMap}`);
                dataMap.set(txnId, { clientId: message.clientId, campaignId: message.campaignId, records: [] });
            }
        } else if (line.includes('AnsIptspPstnRequestDto') && txnId) {
            const requestDto = JSON.parse(line.split('AnsIptspPstnRequestDto: ')[1]);
            const msisdns = requestDto.msisdn.split(','); // Assuming msisdn field is a string with MSISDNs separated by commas
            const rnCode = requestDto.rn_code;
            const data = dataMap.get(txnId);
            // console.log(dataMap.get(txnId));
            if (data) {
                // data.records.push({ msisdn: requestDto.msisdn, rn_code: requestDto.rn_code, type: requestDto.type });
                // msisdns.forEach(msisdn => {
                //     data.records.push({ msisdn: msisdn.trim(), rn_code: requestDto.rn_code, type: requestDto.type, msisdnCount: msisdns.length });
                // });
                if (!data.rnCodeCounts) {
                    data.rnCodeCounts = {};
                }
                const count = data.rnCodeCounts[rnCode] || 0;
                data.rnCodeCounts[rnCode] = count + msisdns.length;
            }
        }
    }
    return dataMap;
};

const writeToExcel = async (dataMap) => {
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet('Promotional Data');
    const campaignData = {};

    // Aggregating data for each campaign
    for (const data of dataMap.values()) {
        const { clientId, campaignId, rnCodeCounts } = data;
        if (!campaignData[campaignId]) {
            campaignData[campaignId] = {
                clientId,
                rnCodeCounts: {}
            };
        }
        // Summing rn_code counts for each campaign
        if (rnCodeCounts) {
            for (const rnCode in rnCodeCounts) {
                if (!campaignData[campaignId].rnCodeCounts[rnCode]) {
                    campaignData[campaignId].rnCodeCounts[rnCode] = 0;
                }
                campaignData[campaignId].rnCodeCounts[rnCode] += rnCodeCounts[rnCode];
            }
        }
    }

    // Getting all unique RN Codes across campaigns
    const allRnCodes = new Set();
    Object.values(campaignData).forEach(({ rnCodeCounts }) => {
        Object.keys(rnCodeCounts).forEach(rnCode => allRnCodes.add(rnCode));
    });

    const rnCodeHeaders = Array.from(allRnCodes).sort().map(rnCode => ({
        header: `RN Code ${rnCode}`,
        key: rnCode,
        width: 15
    }));

    // Setting worksheet headers
    worksheet.columns = [
        { header: 'Client ID', key: 'clientId', width: 15 },
        { header: 'Campaign ID', key: 'campaignId', width: 20 },
        ...rnCodeHeaders
    ];

    // Adding rows to the worksheet
    for (const [campaignId, { clientId, rnCodeCounts }] of Object.entries(campaignData)) {
        const row = { clientId, campaignId };
        rnCodeHeaders.forEach(({ key }) => {
            row[key] = rnCodeCounts[key] || 0;
        });
        worksheet.addRow(row);
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