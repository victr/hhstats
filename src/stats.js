const _ = require('lodash');
const colors = require('colors');
const GamePlayer = require('./game').GamePlayer;

class Stats {
    constructor(params) {
        this.params = params;
        this.players = {};
        this.games = [];
        this.totalBank = 0;
        this.totalRake = 0;
        this.buyins = [];
        this.missedHands = [];
    }

    addGame(game) {
        this.games.push(game);
    }

    calculate() {
        let prevGame;
        this.games.forEach(game => {
            let newBuyIns = 0, negativeBuyIn = false;
            _.forEach(game.players, (gamePlayer, nick) => {
                if (!this.players[nick]) this.players[nick] = new PlayerStats();
                let player = this.players[nick];
                player.handsPlayed++;
                if (gamePlayer.vpip) player.handsVPIP++;
                if (gamePlayer.collected) player.handsWon++;
                if (gamePlayer.allin) player.handsAllIn++;
                player.rake += gamePlayer.rake;
                player.chipsPayed += gamePlayer.payed;
                player.chipsWon += gamePlayer.collected;
                if (gamePlayer.initialChipCount !== player.prevChipCount) {
                    this.buyins.push({
                        nick: nick,
                        buyin: (gamePlayer.initialChipCount - player.prevChipCount),
                        game: game
                    });
                }
                if (gamePlayer.initialChipCount - player.prevChipCount < 0) negativeBuyIn = true;
                if (gamePlayer.initialChipCount - player.prevChipCount > 0 &&
                    gamePlayer.initialChipCount !== (game.bb * 100)) newBuyIns++;
                gamePlayer.prevChipCount = player.prevChipCount;
                player.buyin += gamePlayer.initialChipCount - player.prevChipCount;
                player.prevChipCount = gamePlayer.initialChipCount - gamePlayer.payed + gamePlayer.collected;
                player.cashout = player.prevChipCount;
                gamePlayer.aggregatedResult = player.cashout - player.buyin + player.rake;
                player.lastGameID = game.id;
            });
            this.totalRake += game.rake;
            if (negativeBuyIn || newBuyIns > (game.players.length / 2)) {
                this.missedHands.push({
                    players: _.map(game.players, (p, nick) => new Object({
                        nick: nick, prevChipCount: p.prevChipCount, initialChipCount: p.initialChipCount
                    })),
                    prevGame: prevGame || game,
                    nextGame: game
                });
            }
            prevGame = game;
        });
        this.totalBank += _.reduce(this.players, (a, p) => a + p.buyin, 0);
    }

    print() {
        console.log('Summary: '.yellow);
        console.log(colors.yellow.italic(`Games played: %i, Total bank: %d, Total rake: %d`),
            this.games.length, this.totalBank, this.totalRake);
        if (this.params.verbose) {
            this.printVerbose();
        } else if (this.params.dynamics) {
            this.printDynamics();
        } else {
            this.printSummary();
        }
    }

    printVerbose() {
        this.games.forEach(game => game.print());
        if (this.params.trace) {
            console.log(_.filter(this.players, (player, nick) => nick === this.params.trace));
        } else {
            console.log(this);
        }
        console.log(this.missedHands);
    }

    printSummary() {
        let nickTabs = _.reduce(this.players, (a, p, nick) => Math.max(a, Math.floor(nick.length / 8)), 1);
        console.log(colors.cyan(this.nickWithTabs('Player', nickTabs) +
            '\tplayed\tvpip\twon\twon %\tall-in\t   buyin cashout     net    rake   gross'));
        _.forEach(this.players, (p, nick) => {
            console.log(`%s\t%i\t%i%%\t%i\t%i%%\t%i\t%s%s%s%s%s`,
                this.nickWithTabs(nick, nickTabs),
                p.handsPlayed, Math.round(p.handsVPIP / p.handsPlayed * 100),
                p.handsWon, Math.round(p.handsWon / p.handsVPIP * 100), p.handsAllIn,
                this.spaceToRight(p.buyin, 1),
                this.spaceToRight(p.cashout, 1),
                this.spaceToRight(p.cashout - p.buyin, 1),
                this.spaceToRight(p.rake, 1),
                this.spaceToRight(p.cashout - p.buyin + p.rake, 1)
            );
        });
        if (this.missedHands.length > 0) {
            console.log('\nSome hands are likely missed in the history!\nThese are unexpected changes in the stacks in between two hands:'.red);
            this.missedHands.forEach(missedHand => {
                console.log(`Between hand #%s (%s) and #%s (%s):`.cyan,
                    missedHand.prevGame.id, missedHand.prevGame.datetime,
                    missedHand.nextGame.id, missedHand.nextGame.datetime);
                missedHand.players.forEach(p => {
                    console.log('%s\t%i\t%s\t> %i',
                        this.nickWithTabs(p.nick, nickTabs),
                        this.spaceToRight(p.prevChipCount, 1),
                        this.spaceToRight((p.prevChipCount > p.initialChipCount)
                            ? '+'.concat(p.prevChipCount - p.initialChipCount)
                            : (p.prevChipCount - p.initialChipCount),
                            1),
                        this.spaceToRight(p.initialChipCount, 1)
                    );
                });
            });
        }
        if (this.params.buyins) {
            console.log('\nBuy-ins:'.yellow);
            _.sortBy(this.buyins, b => b.game.id)
                .forEach(b => console.log(
                    this.nickWithTabs(b.nick, nickTabs) + '\t' + b.buyin + '\t(game #' + b.game.id + ')'
                ));
        }
    }

    printDynamics() {
        console.log(
            _.reduce(this.players, (a, p, nick) => a + nick + ',', 'game,')
        );
        this.games.forEach(game => {
            console.log(
                _.reduce(this.players, (a, p, nick) => {
                    let gamePlayer = game.players[nick] || {};
                    if (p.lastGameID === game.id) p.leftTable = true;
                    return a + (p.leftTable
                        ? ''
                        : (gamePlayer.aggregatedResult || '')) + ',';
                }, game.id + ',')
            );
        });
    }

    nickWithTabs(nick, nickTabs) {
        return nick + '\t'.repeat(nickTabs - Math.floor(nick.length / 8));
    }

    spaceToRight(str, tabs) {
        return ' '.repeat(tabs * 8 - String(str).length) + str;
    }
}

class PlayerStats {
    constructor() {
        this.handsPlayed = 0;
        this.handsWon = 0;
        this.handsVPIP = 0;
        this.handsAllIn = 0;
        this.chipsPayed = 0;
        this.chipsWon = 0;
        this.buyin = 0;
        this.cashout = 0;
        this.rake = 0;
        this.prevChipCount = 0;
        this.lastGameID = undefined;
        this.leftTable = false;
    }
}

module.exports = Stats;