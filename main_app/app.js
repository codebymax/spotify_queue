/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

class Queue {
  constructor() {
      this.items = [];
  }

  //enqueue function
  enqueue(element) {
      this.items.push(element);
  }

  //dequeue function
  dequeue() {
      if(this.isEmpty())
          return 'Empty!';
      return this.items.shift();
  }

  //front function see the front object without removal
  front() {
      if(this.isEmpty())
          return 'Empty queue';
      return this.items[0];
  }

  //isEmpty function
  isEmpty() {
      return this.items.length == 0;
  }

  //printQueue function
  printQueue() {
      var str = '';
      for(var i = 0; i < this.items.length; i++)
          str += this.items[i] + ' ';
      return str;
  }
}

var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var SpotifyWebApi = require('spotify-web-api-node');
var passport = require('passport');
var SpotifyStrategy = require('passport-spotify').Strategy;

var client_id = '8aca4f76dd574a1cb9793de66dbc99c1'; // Your client id
var client_secret = 'b190d465849346dc84f0d794a1bfa4dd'; // Your secret
var redirect_uri = 'http://localhost:8888/auth/spotify/callback'; // Your redirect uri

var currentSong = 'Err';
var pastProgress = 0;
var song_queue = new Queue();
var access_token = null;
var refresh_token = null;

var scopes = ['user-read-private', 'user-read-email'];
var state = generateRandomString(16);

var credentials = {
  clientId: client_id,
  clientSecret: client_secret,
  redirectUri: redirect_uri
};

passport.use(new SpotifyStrategy({
  clientID: client_id,
  clientSecret: client_secret,
  callbackURL: redirect_uri
},
function(accessToken, refreshToken, expires_in, profile, done) {
  console.log(accessToken);
  /*
  User.findOrCreate({ spotifyId: profile.id }, function(err, user) {
    return done(err, user);
  });
  */
}));

var app = express();

app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser());

app.get('/auth/spotify', passport.authenticate('spotify'), function(req, res) {
  //this function will not be called
});

app.get('/auth/spotify/callback', 
  passport.authenticate('spotify', {failureRedirect: '/login' }),
  function(req, res) {
    console.log('success')
  })

app.get('/login', function(req, res) {
  console.log('fail rip')
})
console.log('Listening on 8888');
app.listen(8888);
/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */

/*
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser());

app.get('/login', function(req, res) {
  if(access_token != null) {
    var temp = 0
  }
  else {
    console.log('Login begin')
    //console.log(res)
    var state = generateRandomString(16);
    res.cookie(stateKey, state);

    // your application requests authorization
    var scope = 'user-read-private user-read-email user-modify-playback-state user-read-playback-state';
    res.redirect('https://accounts.spotify.com/authorize?' +
      querystring.stringify({
        response_type: 'code',
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state
      }));
  }
});

app.get('/callback', function(req, res) {
  console.log('Callback called')
  //console.log(req)
  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        access_token = body.access_token;
        refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body);
        });

        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

app.get('/get_playing', function(req, res) {
  var access_token = req.query.access_token;

  var playingOptions = {
    url: 'https://api.spotify.com/v1/me/player/currently-playing',
    headers: { 'Authorization': 'Bearer ' + access_token },
    json: true
  };

  request.get(playingOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var name = body.item.name;
      console.log(name + ' ' + body.progress_ms + ' ' + body.item.duration_ms)
      if( (name != currentSong && currentSong != 'Err') || (body.progress_ms == 0 && pastProgress > 0) ) {
        console.log('Song end!');
        currentSong = 'Err';
        pastProgress = body.progress_ms;
        if(song_queue.isEmpty())
        {
          var defaultOptions = {
            url: 'https://api.spotify.com/v1/me/player/play',
            headers: { 'Authorization': 'Bearer ' + access_token },
            body: {
              "context_uri": 'spotify:playlist:6mEx4FB4zZhjPnDReDJ7eV',
              "offset": {
                "position": 0
              },
              "position_ms": 0
            },
            json: true
          };

          request.put(defaultOptions, function(error, response, body) {
            console.log(response.statusCode);
            if (!error && response.statusCode === 204) {
              var resp = "Change successful"
              res.send({
                'success': resp
              });
            }
          });
        }
        else {
          var nextOptions = {
            url: 'https://api.spotify.com/v1/me/player/play',
            headers: { 'Authorization': 'Bearer ' + access_token },
            body: {
              "uris": [song_queue.dequeue()],
              "offset": {
                "position": 0
              },
              "position_ms": 0
            },
            json: true
          };
          
          request.put(nextOptions, function(error, response, body) {
            console.log(response.statusCode);
            if (!error && response.statusCode === 204) {
              var resp = "Change successful"
              res.send({
                'success': resp
              });
            }
          });
        }
      }
      else {
        currentSong = name;
        pastProgress = body.progress_ms;

        res.send({
          'name': name,
          'progress': body.progress_ms,
          'duration': body.item.duration_ms
        });
      }
    }
  });
});

app.get('/change_song', function(req, res) {
  var access_token = req.query.access_token;
  var song_uri = req.query.song_uri;
  if (song_uri == 'null') {
    song_uri = 'null';
  }
  var playOptions = {
    url: 'https://api.spotify.com/v1/me/player/play',
    headers: { 'Authorization': 'Bearer ' + access_token },
    body: {
      "uris": [song_uri],
      "offset": {
        "position": 0
      },
      "position_ms": 0
    },
    json: true
  };

  request.put(playOptions, function(error, response, body) {
    console.log(response.statusCode);
    if (!error && response.statusCode === 204) {
      var success = "Change successful"
      res.send({
        'success': success
      });
    }
  });
});

app.get('/search_song', function(req, res) {
  // changing the song thats playing currently
  
  var access_token = req.query.access_token;
  var search_str = req.query.search_str;
  console.log(access_token);
  console.log(search_str);
  
  var spotifyApi = new SpotifyWebApi({
    clientId: client_id,
    clientSecret: client_secret,
    redirectUri: redirect_uri
  });

  spotifyApi.setAccessToken(access_token);
  
  spotifyApi.searchTracks(search_str, {limit: 1})
  .then(function(data) {
    console.log(data.body);
    if( data.body.tracks.items.length < 1 ) {
      song_uri = 'spotify:track:7GhIk7Il098yCjg4BQjzvb';
    }
    else {
      var song_uri = data.body.tracks.items[0].uri;
    }
    song_queue.enqueue(song_uri);
    console.log('Uri: ', song_uri);
    res.send({
      'song_uri': song_uri
    });
  }, function(err) {
    console.error(err);
  });
});

console.log('Listening on 8888');
app.listen(8888);
*/