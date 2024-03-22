const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const readline = require('readline'); const util = require('util');

// Define the log file path
// const logFilePath = path.join('./applicationLogs', 'application.log');

// // Create a write stream for logging
// const logFile = fs.createWriteStream(logFilePath, { flags: 'a' });

// // Override console.log for asynchronous logging
// console.log = async function (...args) {
//     const message = util.format(...args) + '\n';
//     process.stdout.write(message); // Optional: keep output on the console
//     try {
//         await fs.appendFile(logFilePath, message); // Asynchronously append to the log file
//     } catch (error) {
//         process.stderr.write('Failed to write to log file: ' + error.message);
//     }
// };

// // Override console.error for asynchronous logging
// console.error = async function (...args) {
//     const message = util.format(...args) + '\n';
//     process.stderr.write(message); // Optional: keep output on the console
//     try {
//         await fs.appendFile(logFilePath, message); // Asynchronously append to the log file
//     } catch (error) {
//         process.stderr.write('Failed to write to log file: ' + error.message);
//     }
// };

const logDirectory = '/home/obaydul/a2plogs/mno_10-19Feb/10-Feb';
const outputDirectory = '/home/obaydul/a2plogs/report_february-2024/10-feb';

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
        console.log('Processing file:', filePath);

        // Create a read stream
        const readStream = fs.createReadStream(filePath, 'utf-8');
        const reader = readline.createInterface({
            input: readStream,
            crlfDelay: Infinity // Recognize all instances of CR LF ('\r\n') as a single line break
        });

        // Split the file content into lines
        // const lines = data.split('\n');

        let storedRequestBody;

        // Initialize Excel workbook and worksheet
        // let workbook = new ExcelJS.Workbook();
        // let worksheet = workbook.addWorksheet('SMS Data');
        // ... rest of your Excel setup code here ...
        // Initialize Excel workbook and worksheet in streaming mode
        let workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
            filename: path.join(outputDirectory, `${path.basename(file, '.log')}.xlsx`)
        });
        let worksheet = workbook.addWorksheet('SMS Data');

        // Define the columns for the worksheet
        worksheet.columns = [
            // { header: 'Date', key: 'date', width: 20 },
            // { header: 'TXN ID', key: 'txnId', width: 25 },
            // { header: 'Status Code', key: 'statusCode', width: 15 },
            { header: 'MSISDN', key: 'msisdn', width: 15 },
            { header: 'Bill MSISDN', key: 'billMsisdn', width: 15 },
            { header: 'CLI', key: 'cli', width: 15 },
            { header: 'Type', key: 'messageType', width: 15 },
            { header: 'Character count', key: 'characterCount', width: 15 },
            { header: 'Message count', key: 'messageCount', width: 15 },
            { header: 'Message', key: 'message', width: 50 }
        ];

        // Add a header row with custom text
        // const headerRowNumber = 1;
        // const headerText = "A2P SMS Report"; // Replace with your desired header text
        // worksheet.mergeCells(headerRowNumber, 1, headerRowNumber, worksheet.columns.length); // Merge cells for the header
        // const headerRow = worksheet.getRow(1);
        // headerRow.getCell(1).value = headerText;
        // headerRow.getCell(1).font = { bold: true, size: 14 }; // Style the header as needed
        // headerRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // const headerRow2Number = worksheet.getRow(2);
        // const header2Text = filePath.includes("iptsp") ? "IPTSP SMS Report" : "MNO SMS Report";
        // // worksheet.mergeCells(headerRow2Number, 2, headerRow2Number, worksheet.columns.length); // Merge cells for the header
        // const headerRow2 = worksheet.getRow(2);
        // headerRow2.getCell(1).value = header2Text;
        // headerRow2.getCell(1).font = { bold: true, size: 10 }; // Style the header as needed
        // headerRow2.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // Ensure that data starts from the next row after the header
        // const dataStartRow = headerRow2Number + 5; // Adjust the header row number as needed
        const dataStartRow = 5; // Adjust the header row number as needed

        let storedDate = null;
        const dateRegex = /Date:"(.*?)"/;

        // Process each line from the log file
        reader.on('line', (line) => {
            // ... your line processing code here ...

            // Extract data from the line and add a row to the worksheet
            const txnIdMatch = line.match(/TXN ID: (\S+),/);
            const requestBodyMatch = line.match(/requestBody: ({.*}),/);
            const statusCodeMatch = line.match(/statusCode=(\d+)/);

            // ... other matching and processing logic ...

            // Check if the line contains the date
            const dateMatch = line.match(dateRegex);
            if (dateMatch) {
                storedDate = new Date(dateMatch[1]).toISOString();
            }


            if (txnIdMatch && requestBodyMatch) {
                storedRequestBody = JSON.parse(requestBodyMatch[1]);
            }


            // Add rows to worksheet only if the criteria are met
            if (txnIdMatch && statusCodeMatch && statusCodeMatch[1] === '1000' && storedRequestBody) {
		 worksheet.addRow({
                    // date: storedDate,
                    // txnId: txnIdMatch[1],
                    // statusCode: statusCodeMatch[1],
                    // msisdn: storedRequestBody.msisdnList[0],
                    billMsisdn: storedRequestBody.billMsisdn,
                    cli: storedRequestBody.cli,
                    messageType: storedRequestBody.messageType,
                    characterCount: storedRequestBody.message.length,
                    messageCount: storedRequestBody.messageType == "1" ? (storedRequestBody.message.length <= 160 ? 1 : Math.ceil((storedRequestBody.message.length - 160) / 15) + 1) : storedRequestBody.message.length <= 70 ? 1 : Math.ceil((storedRequestBody.message.length - 70) / 67) + 1,
                    message: storedRequestBody.message
                }, dataStartRow);
            }
        });

        reader.on('close', () => {
            // Once all lines are read, write the Excel file
            workbook.commit()
                .then(() => {
                    console.log(`Excel file for ${file} has been written.`);
                })
                .catch((error) => {
                    console.error(`Failed to write the Excel file for ${file}:`, error);
                });
        });
    });
});
