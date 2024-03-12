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
        console.log('Reading file:', filePath);
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

            // Add a header row with custom text
            const headerRowNumber = 1;
            const headerText = "A2P SMS Report"; // Replace with your desired header text
            worksheet.mergeCells(headerRowNumber, 1, headerRowNumber, worksheet.columns.length); // Merge cells for the header
            const headerRow = worksheet.getRow(1);
            headerRow.getCell(1).value = headerText;
            headerRow.getCell(1).font = { bold: true, size: 14 }; // Style the header as needed
            headerRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

            const headerRow2Number = worksheet.getRow(2);
            const header2Text = filePath.includes("iptsp") ? "IPTSP SMS Report" : "MNO SMS Report";
            // worksheet.mergeCells(headerRow2Number, 2, headerRow2Number, worksheet.columns.length); // Merge cells for the header
            const headerRow2 = worksheet.getRow(2);
            headerRow2.getCell(1).value = header2Text;
            headerRow2.getCell(1).font = { bold: true, size: 10 }; // Style the header as needed
            headerRow2.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };


            // Ensure that data starts from the next row after the header
            const dataStartRow = headerRow2Number + 3; // Adjust the header row number as needed


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
                        messageCount: storedRequestBody.messageType == "1" ? (storedRequestBody.message.length <= 160 ? 1 : Math.ceil((storedRequestBody.message.length - 160) / 15) + 1) : storedRequestBody.message.length <= 70 ? 1 : Math.ceil((storedRequestBody.message.length - 70) / 67) + 1,
                        message: storedRequestBody.message
                    }, dataStartRow);
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
