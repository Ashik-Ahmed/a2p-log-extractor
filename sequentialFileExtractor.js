const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const readline = require('readline');
const util = require('util');

const logDirectory = './logs';
const outputDirectory = './output';

// Ensure output directory exists
if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory);
}

async function processFiles() {
    try {
        const files = fs.readdirSync(logDirectory);

        for (const file of files) {

            let storedRequestBody;

            // Skipping if it's not a log file
            if (path.extname(file) !== '.log') continue;

            const filePath = path.join(logDirectory, file);
            console.log('Processing file:', filePath);

            const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
                filename: path.join(outputDirectory, `sequential_${path.basename(file, '.log')}.xlsx`)
            });
            const worksheet = workbook.addWorksheet('SMS Data');

            // Define the columns for the worksheet
            worksheet.columns = [
                // Define your columns here
                { header: 'Transaction ID', key: 'txnId', width: 25 },
                { header: 'MSISDN', key: 'msisdn', width: 15 },
                { header: 'Operator', key: 'operator', width: 15 },
                { header: 'Bill MSISDN', key: 'billMsisdn', width: 15 },
                { header: 'CLI', key: 'cli', width: 15 },
                { header: 'Type', key: 'messageType', width: 15 },
                { header: 'Character count', key: 'characterCount', width: 15 },
                { header: 'Message count', key: 'messageCount', width: 15 },
                // { header: 'Message', key: 'message', width: 50 }
            ];

            // Your logic to add rows to worksheet

            const readStream = fs.createReadStream(filePath, 'utf-8');
            const reader = readline.createInterface({
                input: readStream,
                crlfDelay: Infinity
            });

            const dataStartRow = 5; // Adjust the header row number as needed

            let storedDate = null;
            const dateRegex = /Date:"(.*?)"/;


            for await (const line of reader) {
                // Your logic to process the line and add rows to worksheet
                // Extract data from the line and add a row to the worksheet
                const txnIdMatch = line.match(/TXN ID: (\S+),/);
                const requestBodyMatch = line.match(/requestBody: ({.*}),/);
                const statusCodeMatch = line.match(/statusCode=(\d+)/);
                // const dippingResponseMatch = line.match(/dipping response:.+operator=(\S+),/);
                const dippingResponseMatch = line.match(/dipping response:.+?operator=(\S+?)\),/);

                // Check if the line contains the date
                const dateMatch = line.match(dateRegex);
                if (dateMatch) {
                    storedDate = new Date(dateMatch[1]).toISOString();
                }


                if (txnIdMatch && requestBodyMatch) {
                    storedRequestBody = JSON.parse(requestBodyMatch[1]);
                }

                if (dippingResponseMatch) {
                    var operatorName = dippingResponseMatch[1];
                }


                // Add rows to worksheet only if the criteria are met
                if (txnIdMatch && statusCodeMatch && statusCodeMatch[1] === '1000' && storedRequestBody) {

                    // if (!storedRequestBody?.msisdnList) {
                    //     console.log(storedRequestBody.msisdnList);
                    // }

                    worksheet.addRow({
                        // date: storedDate,
                        txnId: txnIdMatch[1],
                        // statusCode: statusCodeMatch[1],
                        msisdn: storedRequestBody?.msisdnList || 'no msisdn found',
                        operator: operatorName || 'no operator',
                        billMsisdn: storedRequestBody?.billMsisdn || 'no billmsisdn',
                        cli: storedRequestBody?.cli || 'no cli',
                        messageType: storedRequestBody?.messageType || 'no messageType',
                        characterCount: storedRequestBody?.message?.length || 'no length',
                        messageCount: storedRequestBody?.messageType == "1" ? (storedRequestBody?.message?.length <= 160 ? 1 : Math.ceil((storedRequestBody?.message?.length - 160) / 15) + 1) : storedRequestBody?.message?.length <= 70 ? 1 : Math.ceil((storedRequestBody?.message?.length - 70) / 67) + 1,
                        // message: storedRequestBody?.message
                    }, dataStartRow);
                }
            }

            await workbook.commit();
            console.log(`Excel file for ${file} has been written.`);
        }
    } catch (err) {
        console.error('Error processing files:', err);
    }
}

processFiles();
