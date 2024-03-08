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
                { header: 'TXN ID', key: 'txnId', width: 25 },
                { header: 'MSISDN', key: 'msisdn', width: 15 },
                { header: 'Bill MSISDN', key: 'billMsisdn', width: 15 },
                { header: 'CLI', key: 'cli', width: 15 },
                { header: 'Message', key: 'message', width: 50 }
            ];
            let count = 0;
            // Process each line to find relevant data
            lines.forEach((line) => {
                const txnIdMatch = line.match(/TXN ID: (\S+),/);
                const requestBodyMatch = line.match(/requestBody: ({.*}),/);
                const statusCodeMatch = line.match(/statusCode=(\d+)/);

                if (txnIdMatch && requestBodyMatch) {
                    storedRequestBody = JSON.parse(requestBodyMatch[1]);
                }

                if (!statusCodeMatch) {
                    count++;
                }

                if (txnIdMatch && statusCodeMatch && statusCodeMatch[1] === '1000' && storedRequestBody) {
                    worksheet.addRow({
                        txnId: txnIdMatch[1],
                        msisdn: storedRequestBody.msisdnList[0],
                        billMsisdn: storedRequestBody.billMsisdn,
                        cli: storedRequestBody.cli,
                        message: storedRequestBody.message
                    });
                }
                console.log("Total count: " + count);
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