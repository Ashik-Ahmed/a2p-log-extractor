const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const logDirectory = './logs';
const outputDirectory = './output';

// Ensure output directory exists
if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory);
}

fs.readdir(logDirectory, (err, files) => {
    if (err) {
        console.error('Error reading log directory:', err);
        return;
    }

    files.forEach((file) => {
        const filePath = path.join(logDirectory, file);
        // Read the log file
        fs.readFile(filePath, 'utf-8', (err, data) => {
            if (err) {
                console.error(`Error reading file ${file}:`, err);
                return;
            }

            // Split the file content into lines
            const lines = data.split('\n');
            let storedRequestBody;

            // Create a new workbook and add a worksheet
            let workbook = new ExcelJS.Workbook();
            let worksheet = workbook.addWorksheet('SMS Data');
            worksheet.columns = [
                { header: 'Date', key: 'date', width: 20 },
                { header: 'TXN ID', key: 'txnId', width: 25 },
                { header: 'Status Code', key: 'statusCode', width: 15 },
                { header: 'MSISDN', key: 'msisdn', width: 15 },
                { header: 'Bill MSISDN', key: 'billMsisdn', width: 15 },
                { header: 'CLI', key: 'cli', width: 15 },
                { header: 'Type', key: 'messageType', width: 15 },
                { header: 'Character count', key: 'characterCount', width: 15 },
                { header: 'Message count', key: 'messageCount', width: 15 },
                { header: 'Message', key: 'message', width: 50 }
            ];

            let storedDate = null;
            const dateRegex = /Date:"(.*?)"/;

            // Process each line to find relevant data
            lines.forEach((line) => {
                const txnIdMatch = line.match(/TXN ID: (\S+),/);
                const requestBodyMatch = line.match(/requestBody: ({.*}),/);
                const statusCodeMatch = line.match(/statusCode=(\d+)/);


                // Check if the line contains the date
                const dateMatch = line.match(dateRegex);
                if (dateMatch) {
                    storedDate = new Date(dateMatch[1]).toISOString();
                }


                if (txnIdMatch && requestBodyMatch) {
                    storedRequestBody = JSON.parse(requestBodyMatch[1]);
                }


                if (txnIdMatch && statusCodeMatch && statusCodeMatch[1] === '1000' && storedRequestBody) {
                    worksheet.addRow({
                        date: storedDate,
                        txnId: txnIdMatch[1],
                        statusCode: statusCodeMatch[1],
                        msisdn: storedRequestBody.msisdnList[0],
                        billMsisdn: storedRequestBody.billMsisdn,
                        cli: storedRequestBody.cli,
                        messageType: storedRequestBody.messageType,
                        characterCount: storedRequestBody.message.length,
                        messageCount: messageType == "1" ? (storedRequestBody.message.length <= 160 ? 1 : Math.ceil((storedRequestBody.message.length - 160) / 156) + 1) : storedRequestBody.message.length <= 70 ? 1 : Math.ceil((storedRequestBody.message.length - 70) / 67) + 1,
                        message: storedRequestBody.message
                    });
                }
            });

            // Write to an Excel file
            const excelFilePath = path.join(outputDirectory, `${path.basename(file, '.log')}.xlsx`);
            workbook.xlsx.writeFile(excelFilePath)
                .then(() => {
                    console.log(`Excel file for ${file} has been written.`);
                })
                .catch((error) => {
                    console.error(`Failed to write the Excel file for ${file}:`, error);
                });
        });
    });
});
