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
    const outputFilePath = path.join('./promo-output', 'all_campaigns_with_en_codes.xlsx');
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
            const { campaignId, username, clientId, message, billMsisdn, msisdnList, AnsIptspPstnRequestDto, rn_code } = messageData;
            console.log(`messageData: msisdnList: ${msisdnList}, rn_code: ${rn_code}`);
            if (!campaigns[campaignId]) {
                campaigns[campaignId] = {
                    username,
                    clientId,
                    message,
                    billMsisdn,
                    msisdnCount: 0, // Initialize msisdnCount to 0
                    rnCodeCounts: {}, // Initialize rnCodeCounts to an empty object
                    messageCharacterCount: message ? message.length : 0 // Add message character count
                };
            }
            // Increase count for each unique MSISDN
            if (msisdnList && AnsIptspPstnRequestDto && AnsIptspPstnRequestDto.rn_code) {
                const rn_code = AnsIptspPstnRequestDto.rn_code;
                console.log(`rn_code: ${rn_code}`);
                // If rn_code doesn't exist in the map, initialize it
                if (!campaigns[campaignId].rnCodeCounts[rn_code]) {
                    campaigns[campaignId].rnCodeCounts[rn_code] = 0;
                }
                // Increase count for each MSISDN
                campaigns[campaignId].rnCodeCounts[rn_code] += msisdnList.length;
                // Also increase the total msisdnCount
                campaigns[campaignId].msisdnCount += msisdnList.length;
            }
        }
    });

    return campaigns;
}

function createExcelFile(campaigns, outputFilePath, callback) {
    const wb = new excel4node.Workbook();
    const ws = wb.addWorksheet('Sheet 1');

    // Set the headers
    const fixedHeaders = ['CampaignId', 'Username', 'ClientId', 'Message', 'Message Character Count', 'BillMsisdn', 'Msisdn Count'];
    fixedHeaders.forEach((header, i) => ws.cell(1, i + 1).string(header));

    // Find all unique rn_codes to create headers
    const rnCodes = new Set();
    for (const campaignId in campaigns) {
        for (const rn_code in campaigns[campaignId].rnCodeCounts) {
            rnCodes.add(rn_code);
        }
    }

    // Add rn_code columns to the header
    const rnCodeHeaders = Array.from(rnCodes);
    rnCodeHeaders.forEach((rn_code, i) => ws.cell(1, i + fixedHeaders.length + 1).string(`RN Code ${rn_code} Count`));


    // Add the data to the worksheet
    let row = 2;
    // console.log(campaigns);

    for (const campaignId in campaigns) {
        const campaign = campaigns[campaignId];
        ws.cell(row, 1).string(campaignId);
        ws.cell(row, 2).string(campaign.username || '');
        ws.cell(row, 2).string(campaign.clientId || '');
        ws.cell(row, 3).string(campaign.message || '');
        ws.cell(row, 4).number(campaign.messageCharacterCount);
        ws.cell(row, 5).string(campaign.billMsisdn || '');
        ws.cell(row, 6).number(campaign.msisdnCount);

        // Add rn_code counts
        rnCodeHeaders.forEach((rn_code, i) => {
            const count = campaign.rnCodeCounts[rn_code] || 0;
            console.log(`rn_code: ${rn_code}, count: ${count}`);
            ws.cell(row, i + fixedHeaders.length + 1).number(count);
        });

        row++;
    }

    console.log('rnCodeHeaders', rnCodeHeaders);
    if (rnCodeHeaders.length === 0) {
        console.log('No RN codes found to add to headers.');
    }

    wb.write(outputFilePath, function (err, stats) {
        if (err) {
            console.error(err);
        } else {
            console.log(stats); // Prints out an instance of a node.js fs.Stats object
        }
    });
}

function main() {
    const logDirectoryPath = './promo-logs';
    processLogDirectory(logDirectoryPath);
}

main();