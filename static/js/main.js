var width = 960,
    height = 500,
    centered = null;

// Map root

var root = d3.select("body").append("div").attr("id", "graphic");

// SVG root

var svg = root.append("svg")
    .attr("viewBox", "0 0 " + width + " " + height);
    //.attr("width", width)
    //.attr("height", height);

// Color scales

var colorDomain = [0.035, 0.150];

var redScale = d3.scale.threshold()
    .domain(colorDomain)
    .range(["#fee0d2", "#fc9272", "#de2d26"]);

var blueScale = d3.scale.threshold()
    .domain(colorDomain)
    .range(["#deebf7", "#9ecae1", "#3182bd"]);

var purpleScale = d3.scale.threshold()
    .domain(colorDomain)
    .range(["#efedf5", "#bcbddc", "#756bb1"]);

// Domain is the result of:
//  %republican - %democrat
// Large positive difference --> red (republican)
// Large negative difference --> blue (democrat)
// Small difference --> purple (close call)
// Returns the proper color scale

var republicanOrDemocrat = d3.scale.threshold()
    .domain([-0.05, 0.05])
    .range([blueScale, purpleScale, redScale]);

// Projection settings

var projection = d3.geo.albers()
    .center([0, 38.85])
    .rotate([77.25, 0])
    .parallels([37, 40])
    .scale(10000)
    .translate([width / 2, height / 2]);

// Path generator

var path = d3.geo.path().projection(projection);

// Load data

queue()
    .defer(d3.json, "static/json/maryland.json")
    .await(ready);

function ready(error, maryland) {

    // Background
    svg.append("rect")
        .attr("class", "background")
        .attr("width", width)
        .attr("height", height)
        .on("click", clicked);

    var state = svg.append("g").attr("id", "state");

    // County areas
    state.append("g").attr("id", "counties")
      .selectAll(".county")
        .data(topojson.feature(maryland, maryland.objects.counties).features)
      .enter().append("path")
        .classed("county", true)
        .attr("d", path)
        .style("fill", function(d) {
            var props = d.properties;
            return republicanOrDemocrat( (props.republican - props.democrat) / props.total)(props.weight);
        })
        // only allow hover events if not zoomed in
        .on("mouseover", hoverCounty)
        .on("mouseout", unhoverCounty)
        .on("click", clicked);

    // County borders
    state.append("path")
        .datum(topojson.mesh(maryland, maryland.objects.counties, function(a,b) { return a.id !== b.id; }))
        .attr("id", "county-borders")
        .attr("d", path);

    // County border (singular) -- must come after county borders to appear on top
    var countyBorder = state.append("path").attr("id", "county-border");

    // Tooltip
    var tooltip = root.append("div")
        .attr("id", "tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden");

    function showCountyBorder(d) {
        countyBorder
            .datum(topojson.mesh(maryland, maryland.objects.counties, function(a,b) { return a.id === d.id || b.id === d.id; }))
            .attr("d", path)
            .style("visibility", "visible");
    }
    function hideCountyBorder() {
        countyBorder.style("visibility", "hidden");
    }
    function hoverCounty(d) {
        if (centered === null) {
            showCountyBorder(d);
            showTooltip(d, ["democrat", "republican"]);
        }
    }    
    function unhoverCounty() {
        if (centered === null) {
            hideCountyBorder();
            hideTooltip();
        }
    }
    function showTooltip(tooltipData, tooltipRows) {
        // Find center of (geoJSON) feature based on bounding box (not centroid).
        // Tooltip looks better centered to bounding box.
        var boundingBox = path.bounds(tooltipData)

        // Translate SVG viewBox units to pixels
        var viewboxToPixel = d3.scale.linear().domain([0, width]).range([0, parseFloat(svg.style("width"))])

        var xCenter = viewboxToPixel( (boundingBox[0][0] + boundingBox[1][0]) / 2 );
        var yTop = viewboxToPixel( boundingBox[0][1] );

        tooltip.html(""); // clear tooltip
        tooltip.append("b").classed("tooltip-title", true).text(tooltipData.properties.name);
        var tooltipRows = tooltip.selectAll(".tooltip-row").data(tooltipRows)
          .enter()
            .append("div")
            .classed("tooltip-row", true);
        tooltipRows.append("span")
            .classed("tooltip-color", true)
            .style("background-color", function(d){ return maryland.election[d]["color"]; });
        tooltipRows.append("span")
            .classed("tooltip-name", true)
            .text(function(d){ return maryland.election[d]["candidate"]; });
        tooltipRows.append("span")
            .classed("tooltip-number", true)
            .text(function(d){ return numberString(tooltipData.properties[d]); });
        tooltipRows.append("span")
            .classed("tooltip-percent", true)
            .text(function(d){ return percentString(tooltipData.properties[d] / tooltipData.properties.total); });
   
        // Get "outer width"
        tooltipWidth = parseFloat(tooltip.style("width")) 
                     + parseFloat(tooltip.style("padding-left"))
                     + parseFloat(tooltip.style("padding-right")) 
                     + parseFloat(tooltip.style("border-left-width"))
                     + parseFloat(tooltip.style("border-right-width"));
        
        // Center tooltip and show it
        tooltip
            .style("left", (xCenter - tooltipWidth / 2) + "px")
            .style("top",  (yTop / 16 - 6.2) + "em") // 16px per em
            .style("visibility", "visible"); 
    }
    function hideTooltip() {
        tooltip.style("visibility", "hidden");
    }
    function clicked(d) {
        var x, y, k;

        if (d && centered !== d) {
            // If data/feature exists (rect background has no data/feature)
            // and is not the data/feature of the currently centered D3 object,
            // then center the feature object around its centroid (x,y)
            // and zoom in (k)
            // and record the feature that is currently centered
            var centroid = path.centroid(d);
            x = centroid[0];
            y = centroid[1];
            k = 4;
            centered = d;
            showCountyBorder(d);
        } else {
            x = width / 2;
            y = height / 2;
            k = 1;
           centered = null;
           hideCountyBorder();
        }

        state.transition().duration(750)
            .attr("transform", "translate(" + width/2 + "," + height/2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
            .style("stroke-width", 1/Math.sqrt(k) + "px");

        hideTooltip();
    }
}


// Takes a fractional float and returns a percentage as a string.
// Fixed to one decimal by default.
function percentString(fraction, decimals) {
  if (typeof decimals === 'undefined') {
    decimals = 1;
  }
  var rounded = Math.round(fraction * 1000) / 10;
  return rounded.toFixed(decimals) + "%";
}


// Takes an integer and converts returns a string with a comma every three digits
// From underscore.string.js
function numberString (number) {
  return ('' + number).replace(/(\d)(?=(?:\d{3})+$)/g, '$1' + ',');
}

