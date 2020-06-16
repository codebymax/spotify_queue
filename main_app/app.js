class Queue { //queue data structure used to store song uris
  constructor(arr) {
    if(arr === undefined)
      this.items = [];
    else
      this.items = arr;
  }

  getArr() {
    return this.items;
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

var count = 0
var users = {}

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var admin = require('firebase-admin'); //firebase-admin library
var serviceAccount = require(__dirname + '/alexaq-firebase-adminsdk-udajg-736b571d1a.json');
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var SpotifyWebApi = require('spotify-web-api-node'); 
const bufferFrom = require('buffer-from');
var url = 'https://alexaq.appspot.com';
//var url = 'http://localhost:8888';
var client_id = '8aca4f76dd574a1cb9793de66dbc99c1',
  client_secret = 'b190d465849346dc84f0d794a1bfa4dd',
  redirect_uri = url + '/callback';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://alexaq.firebaseio.com"
});

let db = admin.firestore();

var user_queue = new Queue();

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
  user_queue.enqueue(req.query.user);
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
            refresh_token: refresh_token,
            user: user_queue.dequeue()
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

app.get('/startMain', function(req, res) {
  if(!(req.query.username in users)) {
    users[req.query.username] = {
      "access_token": req.query.access_token,
      "refresh_token": req.query.refresh_token,
      "context_uri": req.query.context_uri,
      "counter": req.query.counter,
      "currentSong": req.query.currentSong,
      "pastProgress": req.query.pastProgress,
      "password": req.query.password,
      "queued_up": req.query.queued_up,
      "song_queue": req.query.song_queue
    };

    setInterval( function() { userMain(req.query.username); }, 2000);

    res.send({
      'response': 'success'
    });
  }
})
/**
 * 
 * Endpoint used by webpage and alexa skill to search for a song and add it to the queue
 * Takes in a search string and sends the string to Spotify
 * Spotify sends back the top result and the uri for that song is added to the queue
 * 
 */
app.get('/search_song', function(req, res) {
  // changing the song thats playing currently
  let newUser = false

  if(!(req.query.username in users)) {
    newUser = true
  }
  
  users[req.query.username] = {
    "access_token": req.query.access_token,
    "refresh_token": req.query.refresh_token,
    "context_uri": req.query.context_uri,
    "counter": req.query.counter,
    "currentSong": req.query.currentSong,
    "pastProgress": req.query.pastProgress,
    "password": req.query.password,
    "queued_up": req.query.queued_up,
    "song_queue": req.query.song_queue
  };

  let username = req.query.username,
      search_str = req.query.search_str,
      access_token = users[username]["access_token"],
      refresh_token = users[username]["refresh_token"],
      context_uri = users[username]["context_uri"],
      counter = users[username]["counter"],
      currentSong = users[username]["currentSong"],
      pastProgress = users[username]["pastProgress"],
      password = users[username]["password"],
      queued_up = users[username]["queued_up"],
      song_queue = new Queue(users[username]["song_queue"]);
  
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
      var artist = data.body.tracks.items[0].artists[0].name;
      var name = data.body.tracks.items[0].name;
      var album = data.body.tracks.items[0].album["name"];

      queued_up = true;

      song_queue.enqueue({
        'uri': song_uri,
        'name': name,
        'album': album,
        'artist': artist
      });

      console.log('Uri: ', song_uri);

      let new_data = {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "context_uri": context_uri,
        "counter": counter,
        "currentSong": currentSong,
        "pastProgress": pastProgress,
        "password": password,
        "queued_up": queued_up,
        "song_queue": song_queue.getArr()
      };

      users[username] = new_data;

      db.collection('users').doc(username).set(new_data);

      if(newUser) {
        setInterval( function() { userMain(username); }, 2000);
      }

      res.send({
        'song_uri': song_uri,
        'artist': artist,
        'name': name,
        'album': album
      });
    }
  }, function(err) {
    console.error(err);
  });
});

// Listen to the specified port, or 8888 otherwise
const PORT = process.env.PORT || 8888;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});

function userMain(username) {
  let access_token = users[username]["access_token"],
      refresh_token = users[username]["refresh_token"],
      context_uri = users[username]["context_uri"],
      counter = users[username]["counter"],
      currentSong = users[username]["currentSong"],
      pastProgress = users[username]["pastProgress"],
      password = users[username]["password"]
      queued_up = users[username]["queued_up"],
      song_queue = new Queue(users[username]["song_queue"]);

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
    if( !error && response.statusCode === 204 ) { //Nothing playing
      console.log('Listen to something')
    }
    else if (!error && response.statusCode === 200) { //Playing
      if( !(body.item == null)) {
        var name = body.item.name;
      }
      console.log(name + ' ' + body.progress_ms + ' ' + body.item.duration_ms)
      // This is where we save the current context the user is playing
      request.get(player, function(error, response, body) {
          if( body.context != null && context_uri != body.context.uri) {
            console.log('uri updated')
            context_uri = body.context.uri;

            let data = {
              "access_token": access_token,
              "refresh_token": refresh_token,
              "context_uri": context_uri,
              "counter": counter,
              "currentSong": currentSong,
              "pastProgress": pastProgress,
              "password": password,
              "queued_up": queued_up,
              "song_queue": song_queue.getArr()
            };

            users[username] = data;

            db.collection('users').doc(username).set(data);
          }
      })
      // Now we check to see if the song is over
      if( (name != currentSong && currentSong != '') || (body.progress_ms == 0 && pastProgress > 0) ) {
        console.log('Song end!');
        currentSong = '';
        pastProgress = body.progress_ms;

        // check to see if the queue is empty and switch to normal player
        // this resets to the original context of the player
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
                
                // if the original context was a playlist we reshuffle that playlist
                if(context_uri.includes('playlist')) { 
                  var playlist_id = context_uri.substring(context_uri.lastIndexOf(':')+1);
                  var get_tracks = {
                    url: 'https://api.spotify.com/v1/playlists/' + playlist_id + '/tracks',
                    headers: { 'Authorization': 'Bearer ' + access_token },
                    json: true
                  };

                  request.get(get_tracks, function(error, response, body) {
                    if (!error && response.statusCode === 200) {
                      //spotify doesn't let us just shuffle a playlist
                      //so we have to make a workaround
                      //here we count the songs in the playlist and pick a random index
                      //then we start the playlist at the index with shuffle enabled

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

                        let data = {
                          "access_token": access_token,
                          "refresh_token": refresh_token,
                          "context_uri": context_uri,
                          "counter": counter,
                          "currentSong": currentSong,
                          "pastProgress": pastProgress,
                          "password": password,
                          "queued_up": queued_up,
                          "song_queue": song_queue.getArr()
                        };

                        users[username] = data;

                        db.collection('users').doc(username).set(data);
                      });
                    }
                  });
                }
                //if the user wasnt playing a playlist we can just resume playback normally
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
        //if there's stuff in the queue we want to pop it out and play it
        if(!song_queue.isEmpty()) {
          var nextOptions = {
            url: 'https://api.spotify.com/v1/me/player/play',
            headers: { 'Authorization': 'Bearer ' + access_token },
            body: {
              "uris": [song_queue.dequeue()['uri']],
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

              let data = {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "context_uri": context_uri,
                "counter": counter,
                "currentSong": currentSong,
                "pastProgress": pastProgress,
                "password": password,
                "queued_up": queued_up,
                "song_queue": song_queue.getArr()
              };

              users[username] = data;

              db.collection('users').doc(username).set(data);

              console.log("song changed")
            }
          });
        }
        //if nothing is queued and we have not set queued_up to true. We do nothing!
        else {
          console.log("smile and wave boys")
        }
      }
      //if the song is not over yet
      else {
        currentSong = name;
        pastProgress = body.progress_ms;

        let data = {
          "access_token": access_token,
          "refresh_token": refresh_token,
          "context_uri": context_uri,
          "counter": counter,
          "currentSong": currentSong,
          "pastProgress": pastProgress,
          "password": password,
          "queued_up": queued_up,
          "song_queue": song_queue.getArr()
        };

        users[username] = data;

        console.log('song not over')
      }
    }
  });
}
