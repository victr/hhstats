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
    if (args[i] === '-dynamics') params.dynamics = true;
    if (args[i] === '-buyins') params.buyins = true;
    if (args[i] === '-usetabs') params.useTabs = true;
    if (args[i] === '-convert') params.convert = true;
    if (args[i] === '-trace') {
        params.trace = args[++i];
    }
}

function printHelp() {
    console.log('npm start -- "hh.txt" -buyins                  : to show the summary');
    console.log('npm start -- "hh.txt" -verbose                 : debugging');
    console.log('npm start -- "hh.txt" -verbose -trace Batman   : debugging one player');
    console.log('npm start -- "hh.txt" -dynamics > output.csv   : show stack dynamics to plot a graph');
    console.log('If you need other help please call Batman.');
    return 0;
}

// read input
if (!params.input) return console.error(colors.red('Missing input file with hand history'));
fs.readFile(params.input, 'utf8', function (err, data) {
    if (err) {
        return console.error(colors.red(err));
    } else if (params.convert) {
        convert(data);
    } else {
        exec(data);
    }
});

function convert(data) {
    data.split('\n')
        .map(line => line
            .replace(/\(([0-9]+)\/([0-9]+)\)/, '($$$1/$$$2)')
            .replace(/\(([0-9]+) in chips\)/, '($$$1 in chips)')
            .replace(/(blind|blinds|calls|bets|pot|Rake|collected) ([0-9]+)/, '$1 $$$2')
            .replace(/(bet|collected|won) \(([0-9]+)\)/, '$1 ($$$2)')
            .replace(/raises ([0-9]+) to ([0-9]+)/, 'raises $$$1 to $$$2')
            .replace(/(\(Play Money\) |Home Game )/, '')
        )
        .forEach(line => console.log(line));
}

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