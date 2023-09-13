const Stats = require('./Stats');
const Game = require('./game').Game;
const STREETS = require('./game').STREETS;

class Parser {
    constructor(params, data) {
        this.params = params;
        this.stats = new Stats(params);
        this.success = false;
        this.error = '';
        this.unknownLines = [];
        this.parse(data);
        this.curGame = undefined;
        this.prevHand = undefined;
    }

    parse(data) {
        data.forEach(line => {
            // noinspection LoopStatementThatDoesntLoopJS
            for (let lineType of Object.keys(PATTERNS)) {
                let matched = line.trim().match(PATTERNS[lineType]);
                if (matched) {
                    this.parseLine(lineType, matched);
                    return;
                }
            }
            this.unknownLines.push(line);
        });
        // in case of manual input without empty line at the end
        this.parseLine('EMPTY', undefined);
        this.stats.calculate();
        this.success = true;
    }

    parseLine(lineType, matched) {
        if (PATTERNS[lineType] === PATTERNS.NEW_GAME) {
            this.curGame = new Game(this.params, matched[1], matched[2]);
        } else if (PATTERNS[lineType] === PATTERNS.SEAT) {
            this.curGame.player(matched[1]).initialChipCount = parseFloat(matched[2]);
        } else if (PATTERNS[lineType] === PATTERNS.EMPTY) {
            if (this.curGame) {
                this.stats.addGame(this.curGame);
                this.prevHand = this.curGame;
                this.curGame = undefined;
            }
        } else if (PATTERNS[lineType] === PATTERNS.SMALL_BLIND) {
            this.curGame.paySmallBlind(matched[1], parseFloat(matched[2]));
        } else if (PATTERNS[lineType] === PATTERNS.BIG_BLIND) {
            this.curGame.payBigBlind(matched[1], parseFloat(matched[2]));
        } else if (PATTERNS[lineType] === PATTERNS.BOTH_BLINDS) {
            this.curGame.payBothBlinds(matched[1], parseFloat(matched[2]));
        } else if (PATTERNS[lineType] === PATTERNS.CALLS) {
            this.curGame.player(matched[1]).pay(parseFloat(matched[2]), false);
            if (matched[3]) this.curGame.player(matched[1]).allin = true;
        } else if (PATTERNS[lineType] === PATTERNS.BETS) {
            this.curGame.player(matched[1]).pay(parseFloat(matched[2]), false);
            if (matched[3]) this.curGame.player(matched[1]).allin = true;
        } else if (PATTERNS[lineType] === PATTERNS.RAISES) {
            this.curGame.player(matched[1]).pay(parseFloat(matched[3]), true);
            if (matched[4]) this.curGame.player(matched[1]).allin = true;
        } else if (PATTERNS[lineType] === PATTERNS.FLOP) {
            this.curGame.setStreet(STREETS.FLOP);
        } else if (PATTERNS[lineType] === PATTERNS.TURN) {
            this.curGame.setStreet(STREETS.TURN);
        } else if (PATTERNS[lineType] === PATTERNS.RIVER) {
            this.curGame.setStreet(STREETS.RIVER);
        } else if (PATTERNS[lineType] === PATTERNS.SHOW_DOWN) {
            this.curGame.setStreet(STREETS.SHOW_DOWN);
        } else if (PATTERNS[lineType] === PATTERNS.COLLECTED) {
            this.curGame.player(matched[1]).collect(parseFloat(matched[2]), true);
        } else if (PATTERNS[lineType] === PATTERNS.TOTAL_POT) {
            this.curGame.addPotAndRake(parseFloat(matched[1]), parseFloat(matched[2]))
        } else if (PATTERNS[lineType] === PATTERNS.UNCALLED_BET) {
            this.curGame.player(matched[2]).collect(parseFloat(matched[1]));
        } else if (PATTERNS[lineType] === PATTERNS.JOIN_TABLE) {
            this.curGame.player(matched[1]).joinedTable = true;
        } else if (PATTERNS[lineType] === PATTERNS.RESET) {
            this.stats.addGame(undefined);
        }
    }

}

const PATTERNS = Object.freeze({
    TABLE: /^Table .+/,
    NEW_GAME: /^PokerStars.+Hand #([0-9]+):.+([0-9]{4}\/[0-9]{2}\/[0-9]{2} [0-9:]+)/,
    JOIN_TABLE: /^(.+) joins the table at seat/,
    SEAT: /^Seat [0-9]+: (.+) \(([0-9]+) in chips\)$/,
    SMALL_BLIND: /^(.+): posts small blind ([0-9]+)$/,
    BIG_BLIND: /^(.+): posts big blind ([0-9]+)$/,
    BOTH_BLINDS: /^(.+): posts small & big blinds ([0-9]+)$/,
    HOLE_CARDS: /^(\*)+ HOLE CARDS (\*)+$/,
    DEALT: /^Dealt to /,
    FOLDS: /^(.+): folds/,
    CHECKS: /^(.+): checks$/,
    CALLS: /^(.+): calls ([0-9]+)( and is all-in)?$/,
    BETS: /^(.+): bets ([0-9]+)( and is all-in)?$/,
    RAISES: /^(.+): raises ([0-9]+) to ([0-9]+)( and is all-in)?$/,
    UNCALLED_BET: /^Uncalled bet \(([0-9]+)\) returned to (.+)$/,
    TIMEOUT: /^(.+) has timed out$/,
    NO_HAND: /^(.+): doesn't show hand$/,
    MUCK_HAND: /^(.+): mucks hand$/,
    FLOP: /^(\*)+ FLOP (\*)+/,
    TURN: /^(\*)+ TURN (\*)+/,
    RIVER: /^(\*)+ RIVER (\*)+/,
    SHOW_DOWN: /^(\*)+ SHOW DOWN (\*)+/,
    SUMMARY: /^(\*)+ SUMMARY (\*)+/,
    SHOWS: /^(.+): shows \[([2-9TJQKA][scdh]) ([2-9TJQKA][scdh])]/,
    SHOWS_ONE: /^(.+): shows \[([2-9TJQKA][scdh])]/,
    COLLECTED: /^(.+) collected ([\-0-9]+) from (side |main )?pot/,
    TOTAL_POT: /^Total pot ([0-9]+).* \| Rake ([0-9]+)$/,
    BOARD: /^Board \[/,
    SEAT_SUMMARY: /^Seat [0-9]+: (.+) (\(button\) |\(small blind\) |\(big blind\) )?(folded|showed|mucked|collected)/,
    SAID: /^(.+) said, "/,
    DISCONNECTED: /^(.+) is disconnected$/,
    CONNECTED: /^(.+) is connected$/,
    TIMEOUT_DISCONNECT: /^(.+) has timed out while (being )?disconnected$/,
    SITTING_OUT: /^(.+) is sitting out$/,
    LEAVES: /^(.+) leaves the table$/,
    REMOVED_FROM_TABLE: /^(.+) was removed from the table for failing to post$/,
    EMPTY: /^$/,
    RESET: /^RESET$/
});

module.exports = Parser;