var SpotifyWebApi = require('spotify-web-api-node');

var scopes = ['user-read-private', 'user-read-email'];
var state = 'some-state-of-my-choice';

var spotifyApi = new SpotifyWebApi({
    clientId: '8aca4f76dd574a1cb9793de66dbc99c1',
    clientSecret: 'b190d465849346dc84f0d794a1bfa4dd',
    redirectUri: 'http://localhost:8888/callback'
  });

var authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);
console.log(authorizeURL);