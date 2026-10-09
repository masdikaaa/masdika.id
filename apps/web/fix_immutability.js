const fs = require('fs');
const report = JSON.parse(fs.readFileSync('eslint_report.json', 'utf8'));

for (const result of report) {
    const immutabilityErrors = result.messages.filter(m => m.ruleId === 'react-hooks/immutability');
    if (immutabilityErrors.length > 0) {
        let content = fs.readFileSync(result.filePath, 'utf8');
        let lines = content.split('\n');
        
        let functionsToMove = [];
        
        // Find all async arrow functions that are top-level inside the component
        // Typically they look like:   const fetchSomething = async () => {
        const funcRegex = /^ {2}const (fetch[A-Za-z0-9_]+) = async \((.*?)\) => \{/gm;
        let match;
        while ((match = funcRegex.exec(content)) !== null) {
            const funcName = match[1];
            // Only move if it is reported in errors
            if (immutabilityErrors.some(e => e.message.includes(funcName))) {
                const startIndex = match.index;
                const startLine = content.substring(0, startIndex).split('\n').length - 1;
                
                // Find end line by counting braces
                let openBraces = 0;
                let endLine = startLine;
                let foundOpen = false;
                
                for (let i = startLine; i < lines.length; i++) {
                    const line = lines[i];
                    for (const char of line) {
                        if (char === '{') {
                            openBraces++;
                            foundOpen = true;
                        }
                        if (char === '}') openBraces--;
                    }
                    if (foundOpen && openBraces === 0) {
                        endLine = i;
                        break;
                    }
                }
                
                functionsToMove.push({
                    name: funcName,
                    startLine,
                    endLine,
                    code: lines.slice(startLine, endLine + 1).join('\n')
                });
            }
        }
        
        if (functionsToMove.length > 0) {
            // Remove them from their original positions (from bottom to top to preserve lines)
            functionsToMove.sort((a, b) => b.startLine - a.startLine);
            for (const func of functionsToMove) {
                lines.splice(func.startLine, func.endLine - func.startLine + 1);
            }
            
            content = lines.join('\n');
            
            // Find the first useEffect or handle* function to insert above
            const insertRegex = /^ {2}(useEffect\(|const handle|const \[)/m;
            const insertMatch = insertRegex.exec(content);
            if (insertMatch) {
                const insertLine = content.substring(0, insertMatch.index).split('\n').length - 1;
                
                const funcCodes = functionsToMove.reverse().map(f => f.code).join('\n\n');
                lines.splice(insertLine, 0, funcCodes + '\n');
                
                fs.writeFileSync(result.filePath, lines.join('\n'));
                console.log('Fixed ' + result.filePath);
            } else {
                console.log('Could not find insert point in ' + result.filePath);
            }
        }
    }
}
