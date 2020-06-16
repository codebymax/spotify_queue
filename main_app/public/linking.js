document.getElementById('log-in').onclick = function() {
    $.ajax({
        url: 'https://layla.amazon.com/api/skill/link/M1VY5PVV5N9KY8', //redirect uri
        data: {
            'username': document.getElementById('username').value,
            'password': document.getElementById('password').value
        }
    }).done(function(data) {
        console.log(data.response)
    });
}