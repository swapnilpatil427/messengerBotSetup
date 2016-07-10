var NodeGeocoder = require('node-geocoder');

var options = {
    provider: 'google',

    // Optional depending on the providers
    httpAdapter: 'https', // Default
    apiKey: 'AIzaSyBg4kJqV4jEI6jfvBC4C_oJMWHaJgSbFak', // for Mapquest, OpenCage, Google Premier
    formatter: null // 'gpx', 'string', ...
};

/*
 * GET home page.
 */

var volunteers = [
	{
		name : "Vol1",
		lat : 37.378201,
		lng : -121.921634
	},
	{
		name : "Vol2",
		lat : 37.376828,
		lng: -121.921634
	},
	{
		name : "Vol3",
		lat : 40.743692,
		lng: -111.894959
	}
];


//Converts numeric degrees to radians
function toRad(Value)
{
 return Value * Math.PI / 180;
}



function calcCrow(lat1, lon1, lat2, lon2)
{
  var R = 6371; // km
  var dLat = toRad(lat2-lat1);
  var dLon = toRad(lon2-lon1);
  var lat1 = toRad(lat1);
  var lat2 = toRad(lat2);

  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);

  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  var d = R * c;
  return d;
}

function notify(message, callback){
  volunteers.forEach (function(volunteer){
	  if(calcCrow(message.lat, message.lng, volunteer.lat, volunteer.lng) < 100){
		  console.log("Volunteer found within 100 miles");
	  }
  });

}

var geocoder = NodeGeocoder(options);

// Using callback
geocoder.geocode('29 champs elysée paris', function(err, res) {
    console.log(res);
});

exports.getAllVolunteers = function(address) {
    getGeoCode(address, function(response) {
        return response;
        //notify(response.latitude , response.longitude);
    });
}

function getAllNearByOrg (geocode) {

}



// Or using Promise
function getGeoCode(address, callback) {
    geocoder.geocode(address)
        .then(function(res) {
            console.log(res);
            callback(res);
        })
        .catch(function(err) {
            console.log(err);
        });
}
