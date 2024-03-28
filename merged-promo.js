const fs = require('fs');
const path = require('path');
const excel4node = require('excel4node');

function processLogDirectory(logDirectoryPath) {
    const files = fs.readdirSync(logDirectoryPath);
    let allCampaigns = {}; // Object to hold all campaigns from all log files

    for (const file of files) {
        const filePath = path.join(logDirectoryPath, file);
        if (fs.statSync(filePath).isFile()) {
            // Process each log file and add the campaigns to allCampaigns
            const campaigns = processLogFile(filePath);
            allCampaigns = { ...allCampaigns, ...campaigns };
        }
    }

    // After all log files have been processed, create one Excel file
    const outputFilePath = path.join(logDirectoryPath, 'all_campaigns.xlsx');
    createExcelFile(allCampaigns, outputFilePath);
    console.log(`Excel file for all campaigns has been created.`);
}

// The rest of the functions (extractJSON, processLogFile, createExcelFile)
// remain unchanged.

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

function processLogFile(logFilePath) {
    console.log(`reading file: ${logFilePath}`);
    const logData = fs.readFileSync(logFilePath, 'utf-8');
    const logLines = logData.split('\n');
    const campaigns = {};

    // Parse log lines
    logLines.forEach(line => {
        const messageData = extractJSON(line);
        if (messageData) {
            const { campaignId, username, message, billMsisdn, msisdnList } = messageData;
            if (!campaigns[campaignId]) {
                campaigns[campaignId] = {
                    username,
                    message,
                    billMsisdn,
                    msisdnCount: 0, // Initialize msisdnCount to 0
                    messageCharacterCount: message ? message.length : 0 // Add message character count
                };
            }
            // Increase count for each unique MSISDN
            if (msisdnList) {
                const uniqueMsisdns = new Set([...msisdnList]);
                campaigns[campaignId].msisdnCount += uniqueMsisdns.size;
            }
        }
    });

    return campaigns;
}

function createExcelFile(campaigns, outputFilePath, callback) {
    const wb = new excel4node.Workbook();
    const ws = wb.addWorksheet('Sheet 1');

    // Set the headers
    const headers = ['CampaignId', 'Username', 'Message', 'Message Character Count', 'BillMsisdn', 'Msisdn Count'];
    headers.forEach((header, i) => ws.cell(1, i + 1).string(header));

    // Add the data to the worksheet
    let row = 2;
    // for (const campaignId in campaigns) {
    //     const campaign = campaigns[campaignId];
    //     ws.cell(row, 3).string(campaignId);
    //     ws.cell(row, 1).string(campaign.username || '');
    //     ws.cell(row, 2).string(campaign.message || '');
    //     ws.cell(row, 4).string(campaign.billMsisdn || '');

    //     // Add each msisdn in a new row under the msisdnList column
    //     if (campaign.msisdnList) {
    //         campaign.msisdnList.split('\n').forEach((msisdn, index) => {
    //             ws.cell(row + index, 5).string(msisdn);
    //         });
    //         row += campaign.msisdnList.split('\n').length;
    //     }
    // }

    for (const campaignId in campaigns) {
        const campaign = campaigns[campaignId];
        ws.cell(row, 1).string(campaignId);
        ws.cell(row, 2).string(campaign.username || '');
        ws.cell(row, 3).string(campaign.message || '');
        ws.cell(row, 4).number(campaign.messageCharacterCount); // Add message character count
        ws.cell(row, 5).string(campaign.billMsisdn || '');
        ws.cell(row, 6).number(campaign.msisdnCount); // Add msisdn count

        row++;
    }

    wb.write(outputFilePath);


    // Write to file and call the callback when done
    // wb.write(outputFilePath, function (err, stats) {
    //     if (err) {
    //         console.error(err);
    //     } else {
    //         callback();
    //     }
    // });
}

function main() {
    const logDirectoryPath = './promo-logs';
    processLogDirectory(logDirectoryPath);
}

main();