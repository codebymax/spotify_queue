# shows artist info for a URN or URL

import spotipy
import sys
import pprint
from spotipy.oauth2 import SpotifyClientCredentials

CLIENT_ID = '8aca4f76dd574a1cb9793de66dbc99c1'
CLIENT_SECRET = 'b190d465849346dc84f0d794a1bfa4dd'

if len(sys.argv) > 1:
    search_str = sys.argv[1]
else:
    search_str = 'Radiohead'

client_credentials_manager = SpotifyClientCredentials(client_id=CLIENT_ID, client_secret=CLIENT_SECRET)
sp = spotipy.Spotify(client_credentials_manager=client_credentials_manager)
result = sp.search(search_str)
pprint.pprint(result)