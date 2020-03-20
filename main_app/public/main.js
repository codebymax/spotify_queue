var username = "";
var currentSong = 'Err';
var pastProgress = 0;

(function() {
    /**
     * Obtains parameters from the hash of the URL
     * @return Object
     */

    function getHashParams() {
        var hashParams = {};
        var e, r = /([^&;=]+)=?([^&;]*)/g,
            q = window.location.hash.substring(1);
        while ( e = r.exec(q)) {
            hashParams[e[1]] = decodeURIComponent(e[2]);
        }
        return hashParams;
    }
    var auth_check = false

    firebase.initializeApp({
        apiKey: 'AIzaSyA1F1_j8OXWo76RdO4rg9qCC0HF-n-Kg1A',
        authDomain: 'alexaq.firebaseapp.com',
        projectId: 'alexaq'
    });

    var db = firebase.firestore();

    document.getElementById('load').href = "/login?user=maw1"
    document.getElementById('logged').onclick = function() {
        username = document.getElementById("username").value
        var password = document.getElementById("password").value
        let usersRef = db.collection('users')
        let usr = usersRef.doc(username).get()
        .then(function(documentSnapshot) {
            if(documentSnapshot.exists && documentSnapshot.data().password == password) {
            auth_check = true
            console.log("true")
            $('#login').hide();
            $('#spotify_login').show();
            $('#loggedin').hide();
            $('#error').hide();
            $('#create').hide();
            }
            else {
            $('#error').show()
            }
        })
    }

    document.getElementById('new').onclick = function() {
        $('#create').show();
        $('#login').hide();
        $('#spotify_login').hide();
        $('#loggedin').hide();
        $('#error').hide();
    }

    document.getElementById('sendUserPass').onclick = function() {
        let usersRef = db.collection('users')
        var user = document.getElementById('createUsername').value
        var pass = document.getElementById('createPassword').value
        var cPass = document.getElementById('confirmPassword').value
        if (pass == cPass) {
            usersRef.doc(user).get()
            .then(function(documentSnapshot) {
                if(documentSnapshot.exists) {
                    document.getElementById('createError').innerHTML = "Username taken"
                }
                else {
                    usersRef.doc(user).set({
                        access_token: "",
                        context_uri: "",
                        counter: 0,
                        currentSong: "",
                        password: pass,
                        pastProgress: 0,
                        queued_up: false,
                        refresh_token: "",
                        song_queue: []
                    })
                    .then(function() {
                    username = user
                    $('#create').hide();
                    $('#login').hide();
                    $('#spotify_login').show();
                    $('#loggedin').hide();
                    $('#error').hide();
                    })
                }
            })
        }
        else {
        document.getElementById('createError').innerHTML = "Passwords do not match"
        }
    }

    var userProfileSource = document.getElementById('user-profile-template').innerHTML,
        userProfileTemplate = Handlebars.compile(userProfileSource),
        userProfilePlaceholder = document.getElementById('user-profile');

    var oauthSource = document.getElementById('oauth-template').innerHTML,
        oauthTemplate = Handlebars.compile(oauthSource),
        oauthPlaceholder = document.getElementById('oauth');

    var searchSource = document.getElementById('search-template').innerHTML,
        searchTemplate = Handlebars.compile(searchSource),
        searchPlaceholder = document.getElementById('search');

    var params = getHashParams();

    var access_token = params.access_token,
        refresh_token = params.refresh_token,
        error = params.error;

    username = params.user

    if (error) {
        alert('There was an error during the authentication');
    } else {
        console.log(access_token, auth_check)
        if (!access_token && !auth_check) {
            // render initial screen
            $('#create').hide();
            $('#login').show();
            $('#spotify_login').hide();
            $('#loggedin').hide();
        }
        if(!access_token && auth_check) {
            $('#create').hide();
            $('#login').hide();
            $('#spotify_login').hide();
            $('#loggedin').hide();
        }
        else {
            // render oauth info
            oauthPlaceholder.innerHTML = oauthTemplate({
                access_token: access_token,
                refresh_token: refresh_token
            });

            searchPlaceholder.innerHTML = searchTemplate({ });

            $.ajax({
                url: 'https://api.spotify.com/v1/me',
                headers: {
                    'Authorization': 'Bearer ' + access_token
                },
                success: function(response) {
                    userProfilePlaceholder.innerHTML = userProfileTemplate(response);

                    $('#create').hide();
                    $('#login').hide();
                    $('#spotify_login').hide();
                    $('#loggedin').show();
                    console.log(params)
                    let usersRef = db.collection('users')
                    usersRef.doc(username).get()
                        .then(function(documentSnapshot) {
                            usersRef.doc(username).set({
                                access_token: access_token,
                                context_uri: documentSnapshot.get("context_uri"),
                                counter: documentSnapshot.get("counter"),
                                currentSong: documentSnapshot.get("currentSong"),
                                password: documentSnapshot.get("password"),
                                pastProgress: documentSnapshot.get("pastProgress"),
                                queued_up: documentSnapshot.get("queued_up"),
                                refresh_token: refresh_token,
                                song_queue: documentSnapshot.get("song_queue")
                            })
                        })
                }
            });
        }

        document.getElementById("search_str")
        .addEventListener("keyup", function(event) {
        event.preventDefault();
        if (event.keyCode === 13) {
            document.getElementById("play-new").click();
        }
        });

        document.getElementById('new-token').addEventListener('click', function() {
        $.ajax({
            url: '/refresh_token',
            data: {
            'refresh_token': refresh_token
            }
        }).done(function(data) {
            access_token = data.access_token;
            oauthPlaceholder.innerHTML = oauthTemplate({
            access_token: access_token,
            refresh_token: refresh_token
            });
        });
        }, false);

        document.getElementById('play-new').addEventListener('click', function() {
        var search_str = document.getElementById("search_str").value
        document.getElementById("search_str").value = ""
        var song_uri = 'null';
        
        $.ajax({
            url: '/search_song', //what part of the app to call 
            data: {
            'search_str': search_str
            }
        });
        }, false);
    }
})();