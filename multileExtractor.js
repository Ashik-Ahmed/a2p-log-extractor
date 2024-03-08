const fs = require('fs');
const readline = require('readline');
const excel4node = require('excel4node');

const logDir = './logs';
fs.readdir(logDir, (err, filenames) => {
    if (err) {
        console.error('Error reading log directory:', err);
        return;
    }
    filenames.forEach(processLogFile);
});

function processLogFile(filename) {
    const filePath = `${logDir}/${filename}`;
    const logStream = fs.createReadStream(filePath);
    const lineReader = readline.createInterface({
        input: logStream,
        crlfDelay: Infinity
    });

    const workbook = new excel4node.Workbook();
    const worksheet = workbook.addWorksheet('SMS Data');
    const headers = ['TXN ID', 'MSISDN', 'Bill MSISDN', 'CLI', 'Message'];
    headers.forEach((header, index) => worksheet.cell(1, index + 1).string(header));

    let row = 2;
    lineReader.on('line', (line) => {
        if (line.includes('TXN ID') && line.includes('requestBody')) {
            extractAndWriteData(line, worksheet, row);
            row++;
        }
    });

    lineReader.on('close', () => {
        workbook.write(`${logDir}/Extracted_${filename}.xlsx`);
    });
}

function extractAndWriteData(line, worksheet, row) {
    // Extract TXN ID, requestBody, and other relevant information
    const txnIdMatch = line.match(/TXN ID: (\S+),/);
    const requestBodyMatch = line.match(/requestBody: ({.*}),/);
    // const ANSResponsePayloadMatch = line.match(/AnsMnoResponsePayload: ({.*}),/);

    if (txnIdMatch && requestBodyMatch) {
        const txnId = txnIdMatch[1];
        const requestBody = JSON.parse(requestBodyMatch[1]);
        // const ANSResponsePayload = JSON.parse(ANSResponsePayloadMatch[1]);

        // Extract fields from requestBody
        const msisdn = requestBody.msisdnList ? requestBody.msisdnList[0] : '';
        const billMsisdn = requestBody.billMsisdn || '';
        const cli = requestBody.cli || '';
        const message = requestBody.message || '';
        // const statusCode = ANSResponsePayload && ANSResponsePayload.statusCode ? ANSResponsePayload.statusCode : '';

        // Write the extracted data to the worksheet
        worksheet.cell(row, 1).string(txnId);
        worksheet.cell(row, 2).string(msisdn);
        worksheet.cell(row, 3).string(billMsisdn);
        worksheet.cell(row, 4).string(cli);
        worksheet.cell(row, 5).string(message);
        // worksheet.cell(row, 6).string(statusCode);
    }
}

function safeParse(jsonString) {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('Error parsing JSON:', error);
        return null;
    }
}