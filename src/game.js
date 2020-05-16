const _ = require('lodash');

class Game {
    constructor(params, id, datetime) {
        this.params = params;
        this.id = id;
        this.datetime = datetime;
        this.players = {};
        this.totalPot = 0;
        this.rake = 0;
        this.sb = 0;
        this.bb = 0;
        this.curStreet = STREETS.PREFLOP;
    }

    player(nick) {
        return this.players[nick] = this.players[nick] || new GamePlayer();
    }

    paySmallBlind(nick, sum) {
        let player = this.player(nick);
        // only the first sb is real sb and deductible from the following raises
        player.payBlind(sum, this.sb === 0);
        this.sb = sum;
    }

    payBigBlind(nick, sum) {
        let player = this.player(nick);
        // only the first bb is real sb and deductible from the following raises
        player.payBlind(sum, true);
        this.bb = sum;
    }

    payBothBlinds(nick, sum) {
        let player = this.player(nick);
        // when both blinds are payed sb goes directly to the pot but bb will be deducted from the raises
        player.payBlind(this.bb, true);
        player.payBlind(this.sb, false);
    }

    setStreet(street) {
        this.curStreet = street;
        _.forEach(this.players, p => p.deductible = 0);
    }

    addPotAndRake(pot, rake) {
        this.totalPot = pot;
        this.rake = rake;
        let distributedRake = 0, rakeShare;
        _.filter(this.players, player => player.collected)
            .forEach(player => {
                rakeShare = Math.round(player.collectedFromPot / (pot - rake) * rake);
                player.rake = rakeShare;
                distributedRake += rakeShare;
            });
        if (rake - distributedRake !== 0) {
            // rounding error, goes to the first player
            (_.find(this.players, p => p.rake) || {}).rake += rake - distributedRake;
        }
    }

    print() {
        console.log('Game: ' + this.id);
        if (this.params.trace) {
            console.log(_.filter(this.players, (player, nick) => nick === this.params.trace))
        } else {
            console.log(this);
        }
    }
}

class GamePlayer {
    constructor() {
        this.initialChipCount = 0;
        this.prevChipCount = 0;
        this.payed = 0;
        this.blinds = 0;
        this.deductible = 0;
        this.vpip = false;
        this.collected = 0;
        this.collectedFromPot = 0;
        this.rake = 0;
        this.allin = false;
        this.aggregatedResult = 0;
        this.joinedTable = false;
    }

    pay(sum, isRaise) {
        this.payed += sum;
        this.vpip = true;
        if (isRaise) {
            this.payed -= this.deductible;
            // for raises sum is already the total bet put on the table, including all the deductible
            this.deductible = sum;
        } else {
            // bets and calls can be become deductible if a raise follows
            this.deductible = (sum + this.deductible);
        }
    }

    payBlind(sum, deductible) {
        this.payed += sum;
        this.blinds += sum;
        if (deductible) this.deductible = sum;
    }

    collect(sum, fromPot = false) {
        this.collected += sum;
        if (fromPot) this.collectedFromPot += sum;
    }
}

const STREETS = Object.freeze({
    PREFLOP: 'preflop',
    FLOP: 'flop',
    TURN: 'turn',
    RIVER: 'river',
    SHOW_DOWN: 'showdown'
});

module.exports.Game = Game;
module.exports.STREETS = STREETS;
module.exports.GamePlayer = GamePlayer;