var express = require('express')
    , morgan = require('morgan')
    , gen = require('random-seed')
    , randtoken = require('rand-token')
    , crypto = require('crypto');

var app = express();

// Modified from http://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array-in-javascript
function rand_shuffle(r, o){ 
    for(var j, x, i = o.length; i; j = Math.floor(r(i)), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
};

function macState(seed, card, key) {
    var hmac = crypto.createHmac('sha1', key)
    return hmac.update(seed+","+card).digest('hex');
};


app.set('views', __dirname + '/views')
app.set('view engine', 'ejs')
app.use(morgan('combined'))
app.use(express.static(__dirname + '/public'))


app.set('port', (process.env.PORT || 5000));

app.get('/', function (req, res) {
  var s = req.query.s;
  var c = req.query.c;
  var m = req.query.m;
  var p = req.query.p;
  var h = req.query.h;

  // Get the key from the env
  var key = process.env.KEY
  var hmac;
  var num_cards = 74;

  var seed, card, mac, newmac, hand, participants;

  if ((typeof s == 'undefined') && (typeof p == 'undefined') && (typeof m == 'undefined')) {
    console.log("New deck");
    seed = randtoken.generate(16);
    console.log("Setting seed to: "+seed);
    card = 1;
    console.log("Setting card number to: "+card);
    mac = macState(seed, card, key);
    console.log("HMAC created: "+mac);
    participants = 3;
    hand = 8;
    var url = req.protocol+"://"+req.get('Host')+"/?s="+seed+"&c="+card+"&m="+mac+"&p="+participants+"&h="+hand;
    console.log("Card URL is: "+url);
    res.redirect(url);
  } else if (s == "") {
    res.render('error', {
      error: 'seed (s) missing'
    });
  } else if (c == "") {
    res.render('error', {
      error: 'card number (p) missing'
    });
  } else if (p == "") {
    res.render('error', {
      error: 'participants (h) missing'
    });
  } else if (m == "") {
    res.render('error', {
      error: 'mac token (m) missing'
    });
  } else if (h == "") {
    res.render('error', {
      error: 'hand (h) missing'
    });
  } else {

    console.log("Existing deck")
    seed = s
    console.log("Seed given: "+seed)
    card = c
    console.log("Card given: "+card)
    mac = m
    console.log("HMAC given: "+mac)
    participants = p;
    console.log("Participants given: "+participants)
    //hand = Math.floor(num_cards / participants);
    hand = h;
    console.log("HAND given: "+hand)

    newmac = macState(seed, card, key);
    console.log("New HMAC: "+newmac)

    if (newmac != mac) {
      res.render('error', {
        error: 'incorrect mac'
      });
    } else {
      var currenturl = req.protocol+"://"+req.get('Host')+"/?s="+seed+"&c="+card+"&m="+mac+"&p="+participants+"&h="+hand;
      var url, prevurl, prevcard


      var cardValues = []
      var newCard = card;
      for (var i=1; i<=hand; ++i)  {

        newCard++;

        console.log("Creating previous url")
        if (Number(card) > 1) {
          prevcard = Number(card) - 1
          hmac = crypto.createHmac('sha1', key)
          prevmac = macState(seed, prevcard, key);
          prevurl = "/?s="+seed+"&c="+prevcard+"&m="+prevmac;
        }

        // Generate set number of cards, please
        console.log("Creating cards array");
        var cards = Array(num_cards).join(0).split(0).map(Number.call, Number);
        var rand = gen.create(seed);
        var shuffled_cards = rand_shuffle(rand, cards);
        var cardIndex = newCard - 1;
        var cardValue = shuffled_cards[cardIndex];
        cardValues.push(cardValue);
        console.log("Current card value: "+cardValue);
  
        if (Number(newCard) < num_cards) {
          console.log("Creating HMAC for new card")
          console.log("New card number: "+newCard);
          console.log("Seed is: "+seed);
          mac = macState(seed, newCard, key);
          console.log("New HMAC is: "+mac);
  
          url = "/?s="+seed+"&c="+newCard+"&m="+mac;
          url = req.protocol+"://"+req.get('Host')+"/?s="+seed+"&c="+newCard+"&m="+mac+"&p="+participants+"&h="+hand;
          console.log("Next card URL is: "+url);
          console.log("Last card: "+macState(seed, num_cards, key));
        }
      }

      res.render('index', { 
        cardValues: cardValues,
        cardValue: cardValue,
        seed: seed,
        card: card,
        currenturl: currenturl,
        url: url,
        prevurl: prevurl
      })
    }
  }
});

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'));
});
