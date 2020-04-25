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
        this.mismatchedHands = [];
        this.totalSum = 0;
        this.prevTotalSum = 0;
    }

    addGame(game) {
        this.games.push(game);
    }

    calculate() {
        let prevHand;
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
                if (gamePlayer.initialChipCount - player.prevChipCount > 0) newBuyIns++;
                gamePlayer.prevChipCount = player.prevChipCount;
                player.buyin += gamePlayer.initialChipCount - player.prevChipCount;
                player.prevChipCount = gamePlayer.initialChipCount - gamePlayer.payed + gamePlayer.collected;
                player.cashout = player.prevChipCount;
                gamePlayer.aggregatedResult = player.cashout - player.buyin + player.rake;
                this.totalSum += gamePlayer.aggregatedResult;
                player.lastGameID = game.id;
            });
            this.totalSum = _.reduce(this.players, (a, p) => a + p.cashout - p.buyin + p.rake, 0);
            if (this.totalSum !== this.prevTotalSum) {
                this.prevTotalSum = this.totalSum;
                this.mismatchedHands.push({
                    prevHand: prevHand || game,
                    curHand: game,
                    allAggregatedResults: _.reduce(this.players, (a, p, nick) => {
                        a[nick] = p.cashout - p.buyin + p.rake;
                        return a;
                    }, {})
                });
            }
            this.totalRake += game.rake;
            if (negativeBuyIn || newBuyIns > (game.players.length / 2)) {
                this.missedHands.push({prevHand: prevHand || game, curHand: game});
            }
            prevHand = game;
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
        console.log(this.mismatchedHands);
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
            this.printMissedHands(nickTabs);
        }
        if (this.mismatchedHands.length > 0) {
            console.log('\nThe total sum mismatch: %s'.red, this.totalSum);
            this.printMismatchedHands(nickTabs);
        }
        if (this.params.buyins) {
            console.log('\nBuy-ins:'.yellow);
            _.sortBy(this.buyins, b => b.game.id)
                .forEach(b => console.log(
                    this.nickWithTabs(b.nick, nickTabs) + '\t' + b.buyin + '\t(game #' + b.game.id + ')'
                ));
        }
    }

    printMismatchedHands(nickTabs) {
        this.mismatchedHands.forEach(hand => {
            console.log(`Mismatched hand #%s (%s):`.yellow, hand.curHand.id, hand.curHand.datetime);
            console.log('%s\t initial   payed collect    rake   chips   total', this.nickWithTabs('player', nickTabs));
            let sums = {payed: 0, collected: 0, rake: 0, total: 0};
            _.forEach(this.players, (p, nick) => {
                if (hand.curHand.players[nick]) {
                    let gp = hand.curHand.players[nick];
                    console.log('%s\t%s%s%s%s%s%s',
                        this.nickWithTabs(nick, nickTabs),
                        this.spaceToRight(gp.initialChipCount, 1),
                        this.spaceToRight('-' + gp.payed, 1),
                        this.spaceToRight('+' + gp.collected, 1),
                        this.spaceToRight(gp.rake, 1),
                        this.spaceToRight(gp.initialChipCount - gp.payed + gp.collected, 1),
                        this.spaceToRight(gp.aggregatedResult, 1)
                    );
                    sums.payed += gp.payed;
                    sums.collected += gp.collected;
                    sums.rake += gp.rake;
                    sums.total += gp.aggregatedResult;
                } else {
                    console.log('%s\t\t\t\t\t\t%s',
                        this.nickWithTabs(nick, nickTabs),
                        this.spaceToRight(hand.allAggregatedResults[nick] || 0, 1)
                    );
                    sums.total += hand.allAggregatedResults[nick] || 0;
                }
            });
            console.log('\t'.repeat(nickTabs) + '\t\t%s%s%s\t%s',
                this.spaceToRight(sums.payed, 1),
                this.spaceToRight(sums.collected, 1),
                this.spaceToRight(sums.rake, 1),
                this.spaceToRight(sums.total, 1)
            );
        });
    }

    printMissedHands(nickTabs) {
        this.missedHands.forEach(hand => {
            console.log(`Between hand #%s (%s) and #%s (%s):`.cyan,
                hand.prevHand.id, hand.prevHand.datetime,
                hand.curHand.id, hand.curHand.datetime);
            _.forEach(hand.curHand.players, (p, nick) => {
                console.log('%s\t%i\t%s\t> %i',
                    this.nickWithTabs(nick, nickTabs),
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

    printDynamics() {
        let separator = this.params.useTabs ? '\t' : ',';
        console.log(
            _.reduce(this.players, (a, p, nick) => a + nick + separator, 'game' + separator)
        );
        this.games.forEach(game => {
            console.log(
                _.reduce(this.players, (a, p, nick) => {
                    let gamePlayer = game.players[nick] || {};
                    a = a + (p.leftTable
                        ? ''
                        : (gamePlayer.aggregatedResult || '')
                    ) + separator;
                    if (p.lastGameID === game.id) p.leftTable = true;
                    return a;
                }, game.id + separator)
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