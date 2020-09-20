# Spotify Queue App

This project creates a method of queuing songs up using Amazon Alexa.

Currently, there is no way to queue songs on Spotify using Alexa. You can tell her to play a certain song along with some other features, but no queue. This is likely due to the fact that currently there is no way to edit a users queue directly using Spotify's Web API. This project aims to create an app that can queue songs on Spotify and edit that queue using an Alexa Skill.

# Limitations:

  - Because Spotify's Web API doesn't provide endpoints to edit a users queue we can't work using the main Spotify queue. For example, if a song is added to the queue on this app, then you check your queue on the Spotify app on your phone, the song that was added will not be there. The queue is stored within the node.js app and when it detects the end of a song the next song is played. 

  - Due to the above limitation, there is another aspect that must be considered. Usually when a song is queued it is positioned before whatever music is playing next in the users current playback environment. For example, say Spotify is playing an album and then a song is queued. The queued song is played next and then the album continues playing from the point it left off. Because we cannot edit this same Spotify queue we will lose the current playback environment as soon as a queued song is played. To work around this limitation we can save what the current playback environment is and then start that playback from the beginning once the queue is empty. It's not a perfect fix, but generally works well especially when shuffling a playlist. 

Stored in this repo is the node.js app that runs on a Google Cloud Platform serverless architecture. The app runs in the background providing an endpoint for the Alexa Skill to hit. 

# Using the app:

In it's current state the app can handle multiple users in a browser. Click the login button and you will be prompted to login to your spotify account. Once logged in, type your search string into the box and press enter. The top result will be added to the queue. 

Amazon Alexa support may be coming in the future, but Amazon's authentication makes things difficult for multiple users to use the app at once.
