var fs = require('fs');
var _ = require('underscore');

var maryland = JSON.parse(fs.readFileSync('data/maryland.json', 'utf8'));

var csvParser = require('csv-parse')({columns: true}, merge);
fs.createReadStream('data/county-general.csv').pipe(csvParser);

// Merge county voting data into maryland topojson
function merge (err, data) {
  data.forEach(function(row) {
        var county = _.find(maryland.objects.counties.geometries, function(geometry){
            return geometry.id === row.id;
        });
        county.properties["republican"] = row.republican;
        county.properties["democrat"] = row.democrat;
        county.properties["total"] = row.total;
        county.properties["weight"] = row.weight;
    });
    fs.writeFileSync('data/maryland.json', JSON.stringify(maryland));
}

