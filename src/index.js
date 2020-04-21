const colors = require('colors');
const fs = require('fs');
const Parser = require('./parser');
const params = {};

// parse args
let args = process.argv.slice(2);
if (args.length === 0) return printHelp();
for (let i = 0; i < args.length; i++) {
    if (args[i] === '-help') return printHelp();
    if (i === 0) params.input = args[0];
    if (args[i] === '-verbose') {
        params.verbose = true;
        params.unknownLines = true;
    }
    if (args[i] === '-unknownLines') params.unknownLines = true;
    if (args[i] === '-trace') {
        params.trace = args[++i];
    }
    if (args[i] === '-buyins') params.buyins = true;
}

function printHelp() {
    console.log('npm start -- "hh.txt" -buyins                  : to show the summary');
    console.log('npm start -- "hh.txt" -verbose                 : debugging');
    console.log('npm start -- "hh.txt" -verbose -trace Batman   : debugging one player');
    console.log('If you need other help please call Batman.');
    return 0;
}

// read input
if (!params.input) return console.error(colors.red('Missing input file with hand history'));
fs.readFile(params.input, 'utf8', function (err, data) {
    if (err) {
        return console.error(colors.red(err));
    } else {
        exec(data);
    }
});

// process hand history
function exec(data) {
    console.log(colors.italic('Parsing ' + params.input));
    let parser = new Parser(params, data.split('\n'));
    if (!parser.success) return console.error(colors.red('Parsing failed:\n' + parser.error));
    if (parser.unknownLines.length > 0) {
        console.error(colors.red(parser.unknownLines.length + ' unknown lines found'));
        if (params.unknownLines) console.log(colors.red('Unknown lines:\n'.red + parser.unknownLines.join('\n')));
    }
    parser.stats.print();
}

return 0;