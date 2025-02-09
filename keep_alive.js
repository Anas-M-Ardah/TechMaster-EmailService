const http = require('http');

http.createServer((req, res) => {
    res.write("I'm alive!");
    res.end();
}).listen(3000);