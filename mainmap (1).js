// 
// mainmap.js  —  IP: Application Development | Assignment #1
// OpenLayers V4 web map.
//   - View control buttons (from class code)
//   - Task 1: measure the geographical distance between 2 points
//   - Task 2: center the map on the user's current location

// --- Initial view settings ----------------------------------
let initialZoomLevel = 10;
let initialCenter = [1588911.734653, 6026906.806230]; // Salzburg, EPSG:3857

// --- Vector layer used to draw the measurement points & line -
let measureSource = new ol.source.Vector();
let measureLayer = new ol.layer.Vector({
  source: measureSource,
  style: new ol.style.Style({
    stroke: new ol.style.Stroke({ color: '#e63946', width: 3 }),
    image: new ol.style.Circle({
      radius: 6,
      fill: new ol.style.Fill({ color: '#e63946' }),
      stroke: new ol.style.Stroke({ color: '#ffffff', width: 2 })
    })
  })
});

// --- Vector layer used to mark the user's location -----------
let locationSource = new ol.source.Vector();
let locationLayer = new ol.layer.Vector({
  source: locationSource,
  style: new ol.style.Style({
    image: new ol.style.Circle({
      radius: 8,
      fill: new ol.style.Fill({ color: '#2a9d8f' }),
      stroke: new ol.style.Stroke({ color: '#ffffff', width: 3 })
    })
  })
});

// --- The map object -----------------------------------------
let mapObjectInput = {
  layers: [
    new ol.layer.Tile({ source: new ol.source.OSM() }),
    measureLayer,
    locationLayer
  ],
  target: 'map',
  view: new ol.View({
    center: initialCenter,
    zoom: initialZoomLevel
  })
};

var map = new ol.Map(mapObjectInput);

// --- Small helper to write messages on the page -------------
var messageBox = document.getElementById('message');
function showMessage(text) {
  messageBox.innerHTML = text;
}

// View control buttons (from the code written in class)
document.getElementById('zoom-out').onclick = function() {
  var view = map.getView();
  view.setZoom(view.getZoom() - 1);
};

document.getElementById('zoom-in').onclick = function() {
  var view = map.getView();
  view.setZoom(view.getZoom() + 1);
};

document.getElementById('reset').onclick = function() {
  var view = map.getView();
  view.animate({ zoom: initialZoomLevel }, { center: initialCenter });
};

document.getElementById('left').onclick = function() {
  var view = map.getView();
  var c = view.getCenter();
  view.animate({ center: [c[0] - 100000, c[1]] });
};

document.getElementById('right').onclick = function() {
  var view = map.getView();
  var c = view.getCenter();
  view.animate({ center: [c[0] + 100000, c[1]] });
};

document.getElementById('up').onclick = function() {
  var view = map.getView();
  var c = view.getCenter();
  view.animate({ center: [c[0], c[1] + 100000] });
};

document.getElementById('down').onclick = function() {
  var view = map.getView();
  var c = view.getCenter();
  view.animate({ center: [c[0], c[1] - 100000] });
};

// TASK 1: Measure the distance between two points

// State of the application: are we currently measuring?
var isMeasuring = false;
// Stores the two clicked coordinates (in map projection EPSG:3857).
var measurePoints = [];

// Sphere used to compute real geographical distance on the WGS84 ellipsoid.
var wgs84Sphere = new ol.Sphere(6378137);

var measureButton = document.getElementById('measure');

// Clicking the button switches the system into "measurement state".
measureButton.addEventListener('click', function() {
  isMeasuring = true;
  measurePoints = [];
  measureSource.clear();                 // remove any previous drawing
  measureButton.classList.add('active'); // visual feedback on the button
  messageBox.classList.add('measuring'); // highlight the message box
  showMessage('Measurement mode is ON &mdash; click the <b>first</b> point on the map.');
});

// A single click handler on the map. It only acts while measuring.
map.on('click', function(e) {
  if (!isMeasuring) {
    return; // normal state: do nothing special
  }

  // Store the clicked coordinate and draw a point feature for it.
  measurePoints.push(e.coordinate);
  measureSource.addFeature(new ol.Feature(new ol.geom.Point(e.coordinate)));

  if (measurePoints.length === 1) {
    // First point captured, wait for the second one.
    showMessage('First point set &mdash; now click the <b>second</b> point.');

  } else if (measurePoints.length === 2) {
    // Draw the line connecting the two points.
    measureSource.addFeature(
      new ol.Feature(new ol.geom.LineString(measurePoints))
    );

    // Convert both points from map projection (EPSG:3857)
    // to geographic coordinates (EPSG:4326) so the distance is real.
    var p1 = ol.proj.transform(measurePoints[0], 'EPSG:3857', 'EPSG:4326');
    var p2 = ol.proj.transform(measurePoints[1], 'EPSG:3857', 'EPSG:4326');

    // Great-circle (haversine) distance in metres.
    var distance = wgs84Sphere.haversineDistance(p1, p2);

    // Format nicely: metres for short distances, kilometres for long ones.
    var pretty;
    if (distance >= 1000) {
      pretty = (distance / 1000).toFixed(2) + ' km';
    } else {
      pretty = distance.toFixed(2) + ' m';
    }

    showMessage('Geographical distance between the two points: <b>' + pretty + '</b>');

    // Return the system to its normal state.
    isMeasuring = false;
    measurePoints = [];
    measureButton.classList.remove('active');
    messageBox.classList.remove('measuring');
  }
});

// TASK 2: Center the map on the user's current location
document.getElementById('locate').addEventListener('click', function() {

  // Check that the browser supports the Geolocation API.
  if (!navigator.geolocation) {
    showMessage('Geolocation is not supported by your browser.');
    return;
  }

  showMessage('Locating you&hellip; (please allow location access)');

  // Ask the browser for the current position.
  navigator.geolocation.getCurrentPosition(
    // Success callback
    function(position) {
      var lon = position.coords.longitude;
      var lat = position.coords.latitude;

      // Convert lon/lat (EPSG:4326) to the map projection (EPSG:3857).
      var coord = ol.proj.fromLonLat([lon, lat]);

      // Smoothly move the view to the user's location.
      map.getView().animate({ center: coord, zoom: 14 });

      // Drop a marker at that location.
      locationSource.clear();
      locationSource.addFeature(new ol.Feature(new ol.geom.Point(coord)));

      showMessage('Map centered on your location ' +
                  '(lat: ' + lat.toFixed(5) + ', lon: ' + lon.toFixed(5) + ').');
    },
    // Error callback
    function(error) {
      showMessage('Unable to get your location: ' + error.message);
    }
  );
});
