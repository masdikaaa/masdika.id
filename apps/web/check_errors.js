const fs = require('fs');
const report = JSON.parse(fs.readFileSync('eslint_report_2.json', 'utf8'));

let otherErrors = [];
for (const result of report) {
    for (const msg of result.messages) {
        if (msg.severity > 1) { // Error
            otherErrors.push({ file: result.filePath, ruleId: msg.ruleId, message: msg.message, line: msg.line });
        }
    }
}
console.log(otherErrors);
