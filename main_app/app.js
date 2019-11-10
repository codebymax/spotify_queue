class Queue { //queue data structure used to store song uris
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

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var SpotifyWebApi = require('spotify-web-api-node'); 
const bufferFrom = require('buffer-from')
var url = 'https://asiaqueue.appspot.com';
var client_id = '8aca4f76dd574a1cb9793de66dbc99c1',
  client_secret = 'b190d465849346dc84f0d794a1bfa4dd',
  //redirect_uri =  'http://localhost:8888/callback';
  redirect_uri = url + '/callback';

var counter = 0;
var currentSong = 'Err';
var pastProgress = 0;
var song_queue = new Queue();
var access_token = null;
var refresh_token = null;
var context_uri = null;
var queued_up = false;
var state = 0;

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
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

/**
 * Endpoint that is initially called by webpage upon clicking of the login button
 */
app.get('/login', function(req, res) {
  if(access_token != null) {
    res.redirect('/#' +
      querystring.stringify({
        access_token: access_token,
        refresh_token: refresh_token
      }));
  }
  else {
    console.log('Login begin')
    //console.log(res)
    
    var state = generateRandomString(16);
    res.cookie(stateKey, state);
    //console.log(state)
    // your application requests authorization
    var scope = 'user-library-read user-read-private user-read-email user-modify-playback-state user-read-playback-state';
    res.redirect('https://accounts.spotify.com/authorize?' +
      querystring.stringify({
        response_type: 'code',
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state
      }));
    
    var scopes = ['user-library-read', 'user-read-private', 
      'user-read-email', 'user-modify-playback-state', 
      'user-read-playback-state'];

  }
});

/**
 * Callbakc endpoint that is hit by Spotify after login is initiated
 */
app.get('/callback', function(req, res) {
  console.log('Callback called')
  //console.log(req)
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
        'Authorization': 'Basic ' + (bufferFrom(client_id + ':' + client_secret).toString('base64'))
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

/**
 * Endpoint used to generate new refresh token
 */
app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (bufferFrom(client_id + ':' + client_secret).toString('base64')) },
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

/**
 * Primary endpoint for the app.
 * Checks the current playing song
 */
app.get('/get_playing', function(req, res) {
  //get the current playing track and detect song change
  //this endpoint is hit every second
  counter++;

  var playingOptions = {
    url: 'https://api.spotify.com/v1/me/player/currently-playing',
    headers: { 'Authorization': 'Bearer ' + access_token },
    json: true
  };

  var player = {
    url: 'https://api.spotify.com/v1/me/player',
    headers: { 'Authorization': 'Bearer ' + access_token },
    json: true
  };

  request.get(playingOptions, function(error, response, body) {
    if( !error && response.statusCode === 204 ) {
      state = 0; //no song playing
      console.log('Listen to something')
      res.send({
        'success': 'nothing playing'
      });
    }
    else if (!error && response.statusCode === 200) {
      state = 1; //there is a song playing but not queued
      var name = body.item.name;
      console.log(name + ' ' + body.progress_ms + ' ' + body.item.duration_ms)
      if( !queued_up && counter % 15 == 0 ) {
        request.get(player, function(error, response, body) {
            if( body.context != null) {
              context_uri = body.context.uri;
            }
            console.log(context_uri)
        })
      }
      if( (name != currentSong && currentSong != 'Err') || (body.progress_ms == 0 && pastProgress > 0) ) {
        console.log('Song end!');
        currentSong = 'Err';
        pastProgress = body.progress_ms;

        if(song_queue.isEmpty() && queued_up) {
          queued_up = false;
          var shuffle = {
            url: 'https://api.spotify.com/v1/me/player/shuffle?state=true',
            headers: { 'Authorization': 'Bearer ' + access_token },
            json: true
          };

          request.put(shuffle, function(error, response, body) {
            if (!error && response.statusCode === 204) {
              console.log("Shuffled!");
              if( context_uri != null ) {
                console.log(context_uri);
                if(context_uri.includes('playlist')) {
                  var playlist_id = context_uri.substring(context_uri.lastIndexOf(':')+1);
                  console.log(playlist_id);
                  var get_tracks = {
                    url: 'https://api.spotify.com/v1/playlists/' + playlist_id + '/tracks',
                    headers: { 'Authorization': 'Bearer ' + access_token },
                    json: true
                  };

                  request.get(get_tracks, function(error, response, body) {
                    if (!error && response.statusCode === 200) {
                      var num_songs = body.total;
                      var index = Math.floor(Math.random() * num_songs);

                      var resume_playback = {
                        url: 'https://api.spotify.com/v1/me/player/play',
                        headers: { 'Authorization': 'Bearer ' + access_token },
                        body: {
                          "context_uri": context_uri,
                          "offset": {
                            "position": index
                          },
                          "position_ms": 0
                        },
                        json: true
                      };

                      request.put(resume_playback, function(error, response, body) {
                        console.log(response.statusCode);
                        console.log("playback resumed")
                        queued_up = false;
                      });
                    }
                  });
                }
                else {
                  var resume_playback = {
                    url: 'https://api.spotify.com/v1/me/player/play',
                    headers: { 'Authorization': 'Bearer ' + access_token },
                    body: {
                      "context_uri": context_uri,
                      "position_ms": 0
                    },
                    json: true
                  };

                  request.put(resume_playback, function(error, response, body) {
                    console.log(response.statusCode);
                    console.log("playback resumed")
                    queued_up = false;
                  });
                }
              }
            }
          });
        }
        if(!song_queue.isEmpty()) {
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
        else {
          res.send({
            'success': 'smile and wave boys'
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

/**
 * 
 * Endpoint used by webpage and alexa skill to search for a song and add it to the queue
 * Takes in a search string and sends the string to Spotify
 * Spotify sends back the top result and the uri for that song is added to the queue
 * 
 */
app.get('/search_song', function(req, res) {
  // changing the song thats playing currently
  
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
      console.log('Search failed! No results!')
    }
    else {
      var song_uri = data.body.tracks.items[0].uri;
      if( !queued_up ) { //if nothing has been queued yet, Put the program into queue mode
        queued_up = true;
      }
      song_queue.enqueue(song_uri);
      console.log('Uri: ', song_uri);
      res.send({
        'song_uri': song_uri
      });
    }
  }, function(err) {
    console.error(err);
  });
});

// Listen to the specified port, or 8080 otherwise
const PORT = process.env.PORT || 8888;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});

//redirect_uri = url + ':' + PORT + '/callback';
console.log(redirect_uri)
//var checkSong = { url: 'http://localhost:8888/get_playing' };
var checkSong = { url: url + '/get_playing' };
var refreshJSON = { url: url + '/refresh_token', 
                    body: { 
                      'refresh_token': refresh_token
                    }
};

function checkSongEnd() { 
  if(access_token != null) {
    request.get(checkSong);
  }
}

function refresh_key() {
  if(access_token != null) {
    request.get(refreshJSON, function(error, response, body) {

    });
  }
}
setInterval(checkSongEnd, 1000); //checkSongEnd every second
//setInterval(refresh_key, 60000); //refreshKey every 1 minutes
//request.get(test_login)
