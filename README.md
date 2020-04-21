# hhstats
Hand history parser for PokerStars Home Games on play money. 

It shows the total buy-in, cashout and the rake payed by each player. 

You need **all** the hands of the session, otherwise it's not possible to calculate buy-in 
correctly, since PokerStars does not log them separately and buy-ins are calculated 
as the difference in stack sizes in between two hands. 
The history is not written when you're in sit out.

```
npm start -- "hh.txt" -buyins                  : to show the summary
npm start -- "hh.txt" -verbose                 : debugging
npm start -- "hh.txt" -verbose -trace Batman   : debugging one player
```
