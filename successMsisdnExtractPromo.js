const fs = require('fs');

function extractMSISDNs(logFilePath) {
    const msisdnMap = new Map();

    // Read the log file line by line
    const lines = fs.readFileSync(logFilePath, 'utf-8').split('\n');

    // Regex pattern to match RN code-wise IPTSP response
    const pattern = /rnCode\swise\sIPTSP\sresponse\s\{(.*?)\}/g;

    lines.forEach(line => {
        // Find matches using regex pattern
        const matches = [...line.matchAll(pattern)];

        // Iterate over matches
        matches.forEach(match => {
            const response = match[1];
            const responseObj = {};
            // console.log(response);

            // Parse response into object
            response.split(',').forEach(item => {
                // console.log(item);
                const [rnCode, msisdns] = item.trim().split('=');
                // console.log("rn code: ", rnCode, "msisdns: ", msisdns);
                const matches = msisdns.match(/\d{13}/g);
                // console.log("matches: ", matches);
                if (matches && matches.length > 0) {
                    const msisdnList = matches[0].split(',')
                        .map(msisdn => msisdn.trim());
                    // console.log("rn code: ", rnCode);
                    // console.log("msisdnList: ", msisdnList);
                    responseObj[rnCode] = msisdnList;
                }
            });
            console.log(responseObj);
            // Check if statusCode is 1000 for each RN code
            Object.entries(responseObj).forEach(([rnCode, msisdns]) => {
                const statusCode = msisdns.find(msisdn => msisdn.includes('statusCode=1000'));
                console.log("statusCode", statusCode);
                if (statusCode) {
                    if (!msisdnMap.has(rnCode)) {
                        msisdnMap.set(rnCode, []);
                    }
                    msisdnMap.get(rnCode).push(...msisdns);
                }
            });
        });
    });

    return msisdnMap;
}

// Usage example
const logFilePath = './promo-logs/a2p-promo-messaging-iptsp.2024-02-01.proda2ppromotionalserver1.mnpspbd.com.0.log';
const msisdnMap = extractMSISDNs(logFilePath);
console.log(msisdnMap);
