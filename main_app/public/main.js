class User {
    constructor() {
        this.username = ""
        this.access_token = ""
        this.refresh_token = ""
        this.context_uri = ""
        this.currentSong = ""
        this.counter = 0
        this.pastProgress = 0
        this.password = ""
        this.queued_up = false
        this.song_queue = []
    }
}

var user = new User();
var auth_check = false;

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

    function getNewToken() {
        $.ajax({
            url: '/refresh_token',
            data: {
            'refresh_token': user.refresh_token
            }
        }).done(function(data) {
            user.access_token = data.access_token;
            console.log(data.access_token)
            let usersRef = db.collection('users')
            usersRef.doc(user.username).get()
                .then(function(documentSnapshot) {
                    usersRef.doc(user.username).set({
                        access_token: user.access_token,
                        context_uri: documentSnapshot.get("context_uri"),
                        counter: documentSnapshot.get("counter"),
                        currentSong: documentSnapshot.get("currentSong"),
                        password: documentSnapshot.get("password"),
                        pastProgress: documentSnapshot.get("pastProgress"),
                        queued_up: documentSnapshot.get("queued_up"),
                        refresh_token: user.refresh_token,
                        song_queue: documentSnapshot.get("song_queue")
                    })
                })
        });
    }

    firebase.initializeApp({
        apiKey: 'AIzaSyA1F1_j8OXWo76RdO4rg9qCC0HF-n-Kg1A',
        authDomain: 'alexaq.firebaseapp.com',
        projectId: 'alexaq'
    });

    var db = firebase.firestore();

    document.getElementById("refresh").onclick = function() {
        getNewToken()
    }

    document.getElementById('log-in').onclick = function() {
        user.username = document.getElementById("username").value
        let password = document.getElementById("password").value
        let usersRef = db.collection('users')
        let usr = usersRef.doc(user.username).get()
        .then(function(documentSnapshot) {
            if(documentSnapshot.exists && documentSnapshot.data().password == password) {
                auth_check = true
                document.getElementById('connect').href = "/login?user=".concat(user.username)
                console.log(user.username)
                console.log(document.getElementById('connect').href)
                user.access_token = documentSnapshot.data().access_token
                user.refresh_token = documentSnapshot.data().refresh_token
                user.context_uri = documentSnapshot.data().context_uri
                user.currentSong = documentSnapshot.data().currentSong
                user.counter = documentSnapshot.data().counter
                user.pastProgress = documentSnapshot.data().pastProgress
                user.password = documentSnapshot.data().password
                user.queued_up = documentSnapshot.data().queued_up
                user.song_queue = documentSnapshot.data().song_queue

                if(documentSnapshot.data().access_token != "") {
                    $('#login').hide();
                    $('#error').hide();
                    document.getElementById("main").style.display = "inline-block";
                    document.getElementById("search-box").style.display = "inline-block";
                    $('#create-account').hide();
                }
                else {
                    $('#login').hide();
                    $('#error').hide();
                    document.getElementById("main").style.display = "inline-block";
                    document.getElementById("connect-button").style.display = "inline-block";
                    $('#create-account').hide();
                }
            }
            else {
                $('#error').show()
            }
        })
    }

    document.getElementById('new-account').onclick = function() {
        $('#login').hide();
        $('#error').hide();
        $('#main').hide();
        document.getElementById("create-account").style.display = "inline-block";
    }

    document.getElementById('sendUserPass').onclick = function() {
        let usersRef = db.collection('users')
        user.username = document.getElementById('createUsername').value
        var pass = document.getElementById('createPassword').value
        var cPass = document.getElementById('confirmPassword').value
        if (pass == cPass) {
            usersRef.doc(user.username).get()
            .then(function(documentSnapshot) {
                if(documentSnapshot.exists) {
                    document.getElementById('createError').innerHTML = "Username taken"
                }
                else {
                    usersRef.doc(user.username).set({
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
                        user.access_token = ""
                        user.refresh_token = ""
                        user.context_uri = ""
                        user.currentSong = ""
                        user.counter = 0
                        user.pastProgress = 0
                        user.password = pass
                        user.queued_up = false
                        user.song_queue = []

                        document.getElementById('connect').href = "/login?user=".concat(user.username)
                        $('#login').hide();
                        $('#error').hide();
                        document.getElementById("main").style.display = "inline-block";
                        document.getElementById("connect-button").style.display = "inline-block";
                        $('#create-account').hide();
                    })
                }
            })
        }
        else {
            document.getElementById('createError').innerHTML = "Passwords do not match"
        }
    }

    var params = getHashParams();

    var access_token = params.access_token,
        refresh_token = params.refresh_token,
        error = params.error;

    user.username = params.user

    if (error) {
        alert('There was an error during the authentication');
    } else {
        if (!access_token && !auth_check) {
            // render initial screen
            document.getElementById("login").style.display = "inline-block";
            $('#error').hide();
            $('#main').hide();
            $('#create-account').hide();
        }
        if(!access_token && auth_check) {
            $('#login').hide();
            $('#error').hide();
            $('#main').hide();
            $('#create-account').hide();
        }
        else {
            $.ajax({
                url: 'https://api.spotify.com/v1/me',
                headers: {
                    'Authorization': 'Bearer ' + access_token
                },
                success: function(response) {
                    $('#login').hide();
                    $('#error').hide();
                    document.getElementById("main").style.display = "inline-block";
                    $('#create-account').hide();
                    $('#connect-button').hide();
                    document.getElementById("search-box").style.display = "inline-block";
                    let usersRef = db.collection('users')
                    usersRef.doc(user.username).get()
                        .then(function(documentSnapshot) {
                            usersRef.doc(user.username).set({
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

        document.getElementById("search-str")
        .addEventListener("keyup", function(event) {
            event.preventDefault();
            if (event.keyCode === 13) {
                var search_str = document.getElementById("search-str").value
                document.getElementById("search-str").value = ""
                console.log(search_str)
                let usersRef = db.collection('users')
                usersRef.doc(user.username).get()
                    .then(function(documentSnapshot) {
                        if(documentSnapshot.exists) {
                            user.access_token = documentSnapshot.data().access_token
                            user.refresh_token = documentSnapshot.data().refresh_token
                            user.context_uri = documentSnapshot.data().context_uri
                            user.currentSong = documentSnapshot.data().currentSong
                            user.counter = documentSnapshot.data().counter
                            user.pastProgress = documentSnapshot.data().pastProgress
                            user.password = documentSnapshot.data().password
                            user.queued_up = documentSnapshot.data().queued_up
                            user.song_queue = documentSnapshot.data().song_queue
                            
                            $.ajax({
                                url: '/search_song', //what part of the app to call 
                                data: {
                                    'search_str': search_str,
                                    'access_token': user.access_token,
                                    'username': user.username,
                                    'context_uri': user.context_uri,
                                    'counter': user.counter,
                                    'currentSong': user.currentSong,
                                    'pastProgress': user.pastProgress,
                                    'password': user.password,
                                    'queued_up': user.queued_up,
                                    'refresh_token': user.refresh_token,
                                    'song_queue': user.song_queue
                                }
                            }).done(function(data) {
                                console.log(data.error);
                                console.log(data.artist);
                                console.log(data.name);
                                console.log(data.album);
                            });
                        }
                    })
                
            }
        });
    }
})();