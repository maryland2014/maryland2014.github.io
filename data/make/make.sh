#!/bin/bash



# Make TopoJSON object from shapefiles

# Data directory
DATA=/home/ryan/projects/d3/maryland-static/data

# ogr2ogr will not overwrite files
rm -f $DATA/counties.json

# GeoJSON of counties
ogr2ogr -f GeoJSON -t_srs EPSG:4326 $DATA/counties.json $DATA/shapefiles/cnty2010.shp

# TopoJSON from GeoJSON
topojson -o $DATA/maryland.json -s 1e-10 --id-property CNTY00 --properties name=GEODESC -- $DATA/counties.json



# Merge election data into TopoJSON object

# Merge election info
node $DATA/make/mergeElectionInfo.js

# Merge county voting data
node $DATA/make/mergeCountyVotes.js

cp $DATA/maryland.json static/json/maryland.json
