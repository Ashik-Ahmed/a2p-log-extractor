const fs = require('fs');
const path = require('path');
const excel4node = require('excel4node');

// function processLogDirectory(logDirectoryPath) {
//     const files = fs.readdirSync(logDirectoryPath);
//     for (const file of files) {
//         const filePath = path.join(logDirectoryPath, file);
//         if (fs.statSync(filePath).isFile()) {
//             const campaigns = processLogFile(filePath);
//             const outputFilePath = path.join(logDirectoryPath, `${path.parse(file).name}.xlsx`);
//             createExcelFile(campaigns, outputFilePath);
//             console.log(`Excel file for ${file} has been created.`);
//         }
//     }
// }

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
            // console.error('Error parsing JSON', error);
        }
    }
    return null;
}

function processLogDirectory(logDirectoryPath) {
    const files = fs.readdirSync(logDirectoryPath);
    processFilesSequentially(files, logDirectoryPath);
}

function processFilesSequentially(files, logDirectoryPath, index = 0) {
    if (index < files.length) {
        const file = files[index];
        const filePath = path.join(logDirectoryPath, file);
        if (fs.statSync(filePath).isFile()) {
            const campaigns = processLogFile(filePath);
            const outputFilePath = path.join(logDirectoryPath, `${path.parse(file).name}.xlsx`);
            createExcelFile(campaigns, outputFilePath, () => {
                console.log(`Excel file for ${file} has been created.`);
                // Process the next file after the current one is done.
                processFilesSequentially(files, logDirectoryPath, index + 1);
            });
        } else {
            // Skip if it is not a file, and process the next item.
            processFilesSequentially(files, logDirectoryPath, index + 1);
        }
    }
}

// Function to read log file and extract data
function processLogFile(logFilePath) {
    console.log(`reading file: ${logFilePath}`);
    const logData = fs.readFileSync(logFilePath, 'utf-8');
    const logLines = logData.split('\n');
    const campaigns = {};

    // Parse log lines
    logLines.forEach(line => {
        // Extract JSON from line and continue if it's not null
        const messageData = extractJSON(line);
        if (messageData) {
            const { campaignId, username, message, billMsisdn, msisdnList } = messageData;
            // Initialize the campaign object if it doesn't exist
            if (!campaigns[campaignId]) {
                campaigns[campaignId] = {
                    username,
                    message,
                    billMsisdn,
                    msisdnList: ''  // Initialize msisdnList as an empty string
                };
            }
            // Add unique msisdnList to the campaign object
            if (msisdnList) {
                msisdnList.forEach(msisdn => {
                    if (!campaigns[campaignId].msisdnList.includes(msisdn)) {
                        campaigns[campaignId].msisdnList += `${msisdn}\n`; // Add msisdn in a new row
                    }
                });
            }
        }
    });

    return campaigns;
}

// Function to create Excel file
function createExcelFile(campaigns, outputFilePath, callback) {
    const wb = new excel4node.Workbook();
    const ws = wb.addWorksheet('Sheet 1');

    // Set the headers
    const headers = ['CampaignId', 'Username', 'Message', 'BillMsisdn', 'MsisdnList'];
    headers.forEach((header, i) => ws.cell(1, i + 1).string(header));

    // Add the data to the worksheet
    let row = 2;
    for (const campaignId in campaigns) {
        const campaign = campaigns[campaignId];
        ws.cell(row, 3).string(campaignId);
        ws.cell(row, 1).string(campaign.username || '');
        ws.cell(row, 2).string(campaign.message || '');
        ws.cell(row, 4).string(campaign.billMsisdn || '');

        // Add each msisdn in a new row under the msisdnList column
        if (campaign.msisdnList) {
            campaign.msisdnList.split('\n').forEach((msisdn, index) => {
                ws.cell(row + index, 5).string(msisdn);
            });
            row += campaign.msisdnList.split('\n').length;
        }
    }

    // Write to file and call the callback when done
    wb.write(outputFilePath, function (err, stats) {
        if (err) {
            console.error(err);
        } else {
            callback();
        }
    });
}

function main() {
    const logFilePath = './promo-logs';
    processLogDirectory(logFilePath);

}

main();