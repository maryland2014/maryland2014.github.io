var fs = require('fs');

var maryland = JSON.parse(fs.readFileSync('data/maryland.json', 'utf8'));
var election = JSON.parse(fs.readFileSync('data/election.json', 'utf8'));

// Merge election info into maryland topojson
maryland['election'] = election;

fs.writeFileSync('data/maryland.json', JSON.stringify(maryland));


