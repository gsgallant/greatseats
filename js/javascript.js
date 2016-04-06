//Global variables
var lat,
    lng,
    map,
    LatLng,
    markersArray = [],
    tablevar,
    player;

var distanceSearch = 10;

var tableFlag = false;

var isNewUser,
    username,
    approvedUser = false;
var latHome, lngHome;

// Global array, so data isn't trapped inside AJAX call
var eventsReturned = new Array();



//api key=AIzaSyB8vvcf1ZPiUJSALf-j7CJ2IuPl-i_E73c (greg.s.gallant@gmail.com)
//the api is loaded in a script tag at the end of the html file.  That works better than load script in the case where user denies allowing geolocation.

var userBase = new Firebase("cheap-seats.firebaseio.com");


// ======================================================
//      Main Code / Point at which everything starts up 
// ======================================================

$(document).ready(function() {
    $("#about").hide(); // hides 'about performance' subsection
    // until user chooses to look at a performance

    $('.dropdown-toggle').dropdown(); // Initializes dropdown menu for map
    // distance / search distance                    

    getLocation(); //gets user's location and initiates map with center at their location.

    addNewUser(); // Creates listener on modal button
    // For new user form input

    sortClicks(); // create click listeners for sorting table data

    addaReview(); // listens for click on review submission button,
    // writes to firebase

    // This is a click listener for the 'create a new user' checkbox
    // located in the 'join today' modal 

    $('#modalcheck').click(function() {
        var $this = $(this);
        // $this will contain a reference to the checkbox   
        if ($this.is(':checked')) {
            alert("blah");
            // the checkbox was checked 
        } else {
            alert("no");
            // the checkbox was unchecked
        }
    });

    $(".dropdown-menu li").click(function() {

        console.log("dropdown!");

        distanceSearch = $(this).data("dist");
        console.log("whatever lat = " + lat, lng);
        clearPins();
        // latlongtoZip(lat, lng);

    });



    $("#clearAll").click(function() {
        clearPins();
        //tablevar.destroy();
    }); //close clearALL

    $("#backHome").click(function() {
        centerMap(latHome, lngHome);
        clearPins();

    });

    $("#runSearch").on("click", function(e) {
        clearPins();
        e.preventDefault();
        zipsearchBox(); // Currently, returns just zipcode 
        $("#searchTerm").val("");

        // $(document.body).animate({
        //  'scrollTop':   $('#event').offset().top
        // }, 2000); 
    });
});


// ==========================================================================
//                  Google Maps / Mapping and Geocoding-related functions
// ==============================================================================

function initMap(lat, lng) {
    var mapOptions = {
        center: new google.maps.LatLng(lat, lng),
        zoom: 8,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    var geocoder = new google.maps.Geocoder;
    var infoWindow = new google.maps.InfoWindow();
    var latlngbounds = new google.maps.LatLngBounds();
    map = new google.maps.Map(document.getElementById("map"), mapOptions);
    google.maps.event.addListener(map, 'click', function(e) {
        clearPins();
        lat = e.latLng.lat();
        lng = e.latLng.lng();
        var myLatLng = {
            lat: lat,
            lng: lng
        };
        newPin(myLatLng.lat, myLatLng.lng);
        // console.log("Latitude: " + lat + "\r\nLongitude: " + lng);
        latlongtoZip(e.latLng.lat(), e.latLng.lng());
        // Trigger API Search results for area upon click:

    });
}

function latlongtoZip(lat, lng) {

    var urlRequest = ""
    var retCode = "";

    var latlngstr = lat+","+lng;

    // var urlRequest = "https://api.mapfruition.com/geocoder/reverse/" + lat + "," + lng + "?key=56cb30d40c7e5800010000c6496ed67cdd9e40eb56250e1e11e0aeaa"
        // var urlRequest = "https://api.geonames.org/findNearbyPostalCodesJSON?lat=" + lat + "&lng=" + lng + "&radius=.1&username=jagross66"

        var urlRequest = 
        "https://maps.googleapis.com/maps/api/geocode/json?latlng="+latlngstr+"&result_type=postal_code&key=AIzaSyCLK-c5IZaVIY7qgvkQmYS41uG6UQA5lmY";


    $.ajax({
        url: urlRequest,
        method: 'GET'
    }).done(function(response) {

        var zipCode = response.results[0].address_components[0].short_name;
        console.log("zipcode = this works! = "+ zipCode);

        apiSeatgeek(zipCode, distanceSearch);
        return zipCode;
    });
}

function zipsearchBox() {

    var toFind = $("#searchTerm").val().trim();

    var urlRequest = 
    "https://maps.googleapis.com/maps/api/geocode/json?address="+toFind+"&key=AIzaSyCLK-c5IZaVIY7qgvkQmYS41uG6UQA5lmY";


    var retCode = {
        zip: "",
        lat: "",
        lng: ""
    };

    $.ajax({
        url: urlRequest,
        method: "GET"
    }).done(function(response) {

        retCode.lat = response.results[0].geometry.location.lat;
        retCode.lng = response.results[0].geometry.location.lng;

        console.log("google!!!!!");

        centerMap(retCode.lat, retCode.lng);
        newPin(retCode.lat, retCode.lng, "My Location: " + toFind);

        // Go back to reverse geocoding API to get zipcode, again
        // because the geocoding API doesn't return zipcode under all circumstances.

        var latlngstr = retCode.lat+","+retCode.lng;
        var newurlRequest = 
        "https://maps.googleapis.com/maps/api/geocode/json?latlng="+latlngstr+"&result_type=postal_code&key=AIzaSyCLK-c5IZaVIY7qgvkQmYS41uG6UQA5lmY";


        $.ajax({
         url: newurlRequest,
            method: 'GET'
             }).done(function(response) {

             retCode.zip = response.results[0].address_components[0].short_name;
                console.log("zipcode = this, again, works! = "+ retCode.zip);
                console.log("distance set currently to "+ distanceSearch);
                apiSeatgeek(retCode.zip, distanceSearch); //  Populate map with pins
                

            });  // end of inner ajax call

         }); // end of outer ajax call

}

function getLocation() {

    var options = {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
    };

    function success(pos) {
        var crd = pos.coords;
        latHome = crd.latitude;
        lngHome = crd.longitude;
        // latHome = lat;
        // lngHome = lng;
        initMap(latHome, lngHome);

    };

    function error(err) {
        //if user disallows geolocation, default is New Brunswick, NJ. and console.warn error showing that the user disallowed.
        // Rutgers - Latitude: 40.49702710366766, Longitude: -74.45262908935547
        latHome = 40.49702710366766;
        lngHome = -74.45262908935547;
        // latHome = lat;
        // lngHome = lng;
        initMap(latHome, lngHome);
        console.warn('ERROR(' + err.code + '): ' + err.message + " - Default Location is New Brunswick, NJ, Rutgers Univerity");
    };

    navigator.geolocation.getCurrentPosition(success, error, options);

}

function centerMap(lat, lng) {
    var center = new google.maps.LatLng(lat, lng);
    // using global variable:
    map.panTo(center);
    map.setZoom(8);




}

function newPin(lat, lng, pintitle) {
    var myLatLng = {
        lat: lat,
        lng: lng
    };
    var marker = new google.maps.Marker({
        position: myLatLng,
        map: map,
        title: pintitle
    });
    markersArray.push(marker);

    google.maps.event.addListener(marker, "click", function() {});


}

function clearPins() {
    for (var i = 0; i < markersArray.length; i++) {
        markersArray[i].setMap(null);
    }
    markersArray = [];
    $('#details').empty();
    $('#events').empty();



}

// ===========================================================================================
//          API Call-related functions; Functions dealing with sorting and displaying data
// ============================================================================================

function apiSeatgeek(zip, radius, dateStart, dateEnd) {

    // radius is set to work in miles, not kilometers

    function returnObjs(title, performname, date, venuecity, venuename, venuelat, venuelng, minprice, maxprice, performtype, musicgenre) {
        this.title = title;
        this.performname = performname;
        this.date = date;
        this.venuecity = venuecity;
        this.venuelat = venuelat;
        this.venuelng = venuelng;
        this.venuename = venuename;
        this.minprice = minprice;
        this.maxprice = maxprice;
        this.performtype = performtype;
        this.musicgenre = musicgenre;
    }

    console.log("Search radius=" + radius);

    var urlRequest = "https://api.seatgeek.com/2/events?geoip=" + zip + "&range=" + radius + "mi&per_page=100";

    // Array returned
    // Object constructor -- we will return an array of objects; each
    // element of the array equals one concert listing for the geographic 
    // area specified.  

    // for (i=0; i < 100; i++){
    //     eventsReturned[i] = new returnObjs();
    // }

    $.ajax({
        url: urlRequest,
        method: "GET"
    }).done(function(response) {




        var totalListings = response.events.length;
        var markers = [];

        // console.log("total listings: " + totalListings);

        for (x = 0; x < totalListings; x++) {
            eventsReturned[x] = new returnObjs();
            eventsReturned[x].title = response.events[x].title;
            eventsReturned[x].performname = response.events[x].performers[0].name;
            eventsReturned[x].date = response.events[x].datetime_local;

            eventsReturned[x].venuecity = response.events[x].venue.city;
            eventsReturned[x].venuename = response.events[x].venue.name;
            eventsReturned[x].minprice = response.events[x].stats.lowest_price;
            eventsReturned[x].maxprice = response.events[x].stats.highest_price;
            eventsReturned[x].venuelat = response.events[x].venue.location.lat;
            eventsReturned[x].venuelng = response.events[x].venue.location.lon;
            eventsReturned[x].performtype = response.events[x].performers[0].type;
            // eventsReturned[x].musicgenre = response.events[x].performers.genres[0].slug;
            // console.log("perf type: " + eventsReturned[x].performtype);
            // Render a pin onto map for each venue identified in list
            newPin(eventsReturned[x].venuelat, eventsReturned[x].venuelng, eventsReturned[x].venuename + ", " +
                eventsReturned[x].venuecity);

        };

        displaysearchResults("genre");

    });
}

function sortClicks() {

    // Click handlers for buttons that allow you to choose how you want
    // results sorted.  

    $("#genresort").click(function() {

        $("#events").empty();
        displaysearchResults("genre");

    });

    $("#performersort").click(function() {

        $("#events").empty();
        displaysearchResults("performer");
    });

    $("#pricesort").click(function() {

        $("#events").empty();
        displaysearchResults("price");
    });

    $("#venuesort").click(function() {

        $("#events").empty();
        displaysearchResults("venue");
    });

}

function displaysearchResults(sortType) {


    // Take results from Seatgeek, sort the results, and then display
    // the results in a table in the browser.  


    // Arguments that may be passed:
    // "genre" -- sort results by genre
    // "performer" -- sort results alphabetically by entertainer/band/performer's name 
    //  or possibly event title.
    // "price" -- sort results by price.  Currently set to sort results by lowest priced
    // tickets available for each show.  


    // The below function will sort an array of objects, for whichever
    // key you specify.  (Alphabetically ordered).  Found on Stack Overflow.  

    function sorting(json_object, key_to_sort_by) {
        function sortByKey(a, b) {
            var x = a[key_to_sort_by];
            var y = b[key_to_sort_by];
            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
        }

        json_object.sort(sortByKey);
    }

    // PS, The Seatgeek API leaves sorting by date as default

    if (sortType.toLowerCase() === "genre") {

        sorting(eventsReturned, "performtype");
        // console.log("genre!");
        for (y in eventsReturned) {
            // console.log(eventsReturned[y].performtype);
        };

    } else if (sortType.toLowerCase() === "price") {

        sorting(eventsReturned, "minprice");
        // console.log("price minimum sort!");
        for (y in eventsReturned) {
            console.log(eventsReturned[y].minprice);
        };

    } else if (sortType.toLowerCase() === "performer") {

        sorting(eventsReturned, "performname");
        // console.log("title/performance name sort");
        for (y in eventsReturned) {
            //console.log(eventsReturned[y].performname);
        };
    } else if (sortType.toLowerCase() === "venue") {

        sorting(eventsReturned, "venuename");
        // console.log("title/performance name sort");
        for (y in eventsReturned) {
            //console.log(eventsReturned[y].performname);
        };
    }

    // Dynamically render (sorted) selections from ticketing API to 
    // table inside modal.  
    console.log("tablevar is currently: " + tablevar);

    if (tablevar != undefined) {
        tablevar.clear();
        tablevar = undefined;

    }

    for (item in eventsReturned) {

        //uses moment and milToStandard() to get a nicely displaying date and time
        var date = moment(eventsReturned[item].date).format("MM-DD-YYYY");
        var time = milToStandard(moment(eventsReturned[item].date).format("HH:mm:ss"));
        var displayDateTime = date + " - " + time;


        var theList = "<tr class='rowchoice' data-num='" + item + "'><td>" + eventsReturned[item].title + "</td><td>" + eventsReturned[item].performname + "</td><td>" +
            eventsReturned[item].venuename + "</td><td>" + displayDateTime + "</td></tr>";
        //console.log(theList);
        $("#events").append(theList);
    }


    if (tableFlag == false) {
        tablevar = $("#bigTable").DataTable({
            "scrollY": 700,
            "scrollcollapse": true
        });
        tableFlag = true;
    };
    // Attach a MOUSEOVER / hover handler to each row.  When you hover, the 
    // pin corresponding to the show's venue will bounce. 

    // $(document).on("mouseover", ".rowchoice", function() {
    //     // Highlight Markers as you hover over each item on list

    //     var markerChoose = $(this).data("num");
    //     // console.log("data = " + markerChoose);
    //     markersArray[markerChoose].setAnimation(google.maps.Animation.BOUNCE);

    // }).on("mouseout", ".rowchoice", function() {

    //     var markerChoose = $(this).data("num");
    //     markersArray[markerChoose].setAnimation(google.maps.Animation.NONE);

    // }).


    $(document).on("click", ".rowchoice", function() {

        var markerChoose = $(this).data("num");
        $("#about").show();
        window.scrollTo(0, 2200);
        // $('html,body').animate({     // Page scrolls down to 'details' section
        // 'scrollTop':   $('#about').offset().scrollTop.top  // upon click
        // }, 2000);


        if (player != undefined) { // Unless this is your first search
            player.destroy(); // during this session, remove
        } // previous youtube player

        details(markerChoose);
    });


}

function details(pointer) {
    $("#details").empty();
    $("#details").append("<p> Event Title: " + eventsReturned[pointer].title + "</p>");
    $("#details").append("<p> Performer: " + eventsReturned[pointer].performname + "</p>");

    var date = moment(eventsReturned[pointer].date).format("MM-DD-YYYY");
    var time = milToStandard(moment(eventsReturned[pointer].date).format("HH:mm:ss"));
    var displayDateTime = date + " - " + time;

    $("#details").append("<p> Date/Time: " + displayDateTime + "</p>");


    $("#details").append("<p> City: " + eventsReturned[pointer].venuecity + "</p>");
    $("#details").append("<p> Venue: " + eventsReturned[pointer].venuename + "</p>");
    if (eventsReturned[pointer].minprice) {
        $("#details").append("<p> Low Price: $" + eventsReturned[pointer].minprice + "</p>");
    };


    if (eventsReturned[pointer].maxprice) {
        $("#details").append("<p> High Price: $" + eventsReturned[pointer].maxprice + "</p>");
    };

    // $("#details").html("<p>"+ eventsReturned[pointer].venuelat + "</p>");
    // $("#details").html("<p>"+ eventsReturned[pointer].venuelng + "</p>");

    //replace underscores with spaces.
    var peformtype = eventsReturned[pointer].performtype.replace(/_/g, ' ');
    $("#details").append("<p> Genre: " + peformtype + "</p>");

    //*****  call youtubeSearch with the performer.  Fingers crossed...
    // wikiarticle(eventsReturned[pointer].venuename);

    youtubeSearch(eventsReturned[pointer].performname);

}


// ========================================================
//              Youtube API and rendering Functions
// ======================================================== 

// This function will call the youtube DATA API, and it will return the
// ID tag for an appropriate, randomly chosen video from the performer we've
// chosen.  

function youtubeSearch(performer) {


    // This URL will return videos only (no playlists or channels), and then we'll
    // just pick the first result (for now).  The search string equals the function argument,
    // which will be a string containing the name of a performer.  
    //alert(performer);
    var searchURL = "https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=2&format=5&q=" + performer + "&type=video&key=AIzaSyCLK-c5IZaVIY7qgvkQmYS41uG6UQA5lmY";
    $.ajax({
        url: searchURL,
        method: "GET"
    }).done(function(response) {
        var vidOK = true;
        try {
            var dataRet = response.items[0].id.videoId;
        } catch (err) {
            vidOK = false;
            console.log("bad videoID")
        } finally {
            if (vidOK) {
                // console.log("Returned: " + dataRet);
                showmeaVideo(dataRet);
            }
        }


    });

}

function showmeaVideo(youtubeID) {
    console.log("youtube id: " + youtubeID);

    onYouTubeIframeAPIReady();

    function onYouTubeIframeAPIReady() {
        player = new YT.Player('player', {
            height: '200',
            width: '400',
            videoId: youtubeID,
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange
            }
        });
    }

    // 4. The API will call this function when the video player is ready.
    function onPlayerReady(event) {
        event.target.playVideo();
    }

    // 5. The API calls this function when the player's state changes.
    //    The function indicates that when playing a video (state=1),
    //    the player should play for six seconds and then stop.
    var done = false;

    function onPlayerStateChange(event) {
        if (event.data == YT.PlayerState.PLAYING && !done) {
            setTimeout(stopVideo, 6000);
            done = true;
        }
    }

    function stopVideo() {

        try {
            player.stopVideo();
        } catch (err) {
            console.log("bad vidPlayer");
            $("#player").empty();
        } finally {
            return;
        }
    }

}

// =====================================================================
// Firebase-related Functions and User Authentication / Login Functions
// =====================================================================


function addaReview() {

    $("#submitreview").on("click", function(e) {
        e.preventDefault();
        var reviewInput = $("#reviewtext").val();
        var yourName = $("#nameReview").val();
        var reviewOf = $("#subjReview").val();
        $("#nameReview").val("");
        $("#reviewtext").val("");
        $("#subjReview").val("");


        userBase.push({
            name: yourName,
            subj: reviewOf,
            txt: reviewInput
        });

    });

    userBase.on("child_added", function(snapshot) {
        var addedname = snapshot.val().name;
        var addedtxt = snapshot.val().txt;
        var addedsubj = snapshot.val().subj

        $("#renderreviews").append("<p> Review of: " + addedsubj + "</p>");
        $("#renderreviews").append("<p> Reviewer: " + addedname + "</p>");
        $("#renderreviews").append("<p style='border-bottom: 2px solid black;'>" + addedtxt + "</h6>");
    });



}



function addNewUser() {


    $("#modclose").click(function() {

        var email = $("#registerEmail").val().trim();
        var password = $("#registerPassword").val().trim();

        userBase.createUser({
            email: email,
            password: password
        }, function(error, userData) {
            if (error) {
                console.log("Error creating user:", error);
            } else {
                console.log("Successfully created user account with uid:", userData.uid);
            }
        });
    });



}

function userLogin(email, password) {


    // isNewUser argument:  if set to true, this person is a newly created user

    // If the person is a newly created user, upon authenticating them, this code
    // will add them to our user database. ('on authentication' listener)

    userBase.onAuth(function(authData) {
        if (authData && isNewUser) {
            userBase.child("users").child(authData.uid).set({
                name: authData.password.email.replace(/@.*/, '')
            });
        }
    });

    // User authentication code below

    userBase.authWithPassword({
        email: email,
        password: password
    }, function(error, authData) {
        if (error) {
            console.log("Login Failed!", error);
        } else {

            console.log("Authenticated successfully with payload:", authData);
        }
    });

}

function milToStandard(value) {
    if (value !== null && value !== undefined) { //If value is passed in
        if (value.indexOf('AM') > -1 || value.indexOf('PM') > -1) { //If time is already in standard time then don't format.
            return value;
        } else {
            if (value.length == 8) { //If value is the expected length for military time then process to standard time.
                var hour = value.substring(0, 2); //Extract hour
                var minutes = value.substring(3, 5); //Extract minutes
                var identifier = 'AM'; //Initialize AM PM identifier

                if (hour == 12) { //If hour is 12 then should set AM PM identifier to PM
                    identifier = 'PM';
                }
                if (hour == 0) { //If hour is 0 then set to 12 for standard time 12 AM
                    hour = 12;
                }
                if (hour > 12) { //If hour is greater than 12 then convert to standard 12 hour format and set the AM PM identifier to PM
                    hour = hour - 12;
                    identifier = 'PM';
                }
                return hour + ':' + minutes + ' ' + identifier; //Return the constructed standard time
            } else { //If value is not the expected length than just return the value as is

                return value;
            }
        }
    }
};

//wikipedia api
//An approch to getting the summary / leading paragraphs / section 0 out of Wikipedia articlies within the browser using JSONP with the Wikipedia API: https://en.wikipedia.org/w/api.php
// function wikiarticle(title){
//         var url = "http://en.wikipedia.org/wiki/"+title;
//         var title = url.split("/");
//         title = title[title.length - 1];
// alert(title);
//         //Get Leading paragraphs (section 0)

//         $.getJSON("http://en.wikipedia.org/w/api.php?action=parse&page=" + title + "&prop=text&section=0&format=json&callback=?", function (data) {
//             for (text in data.parse.text) {
//                 var text = data.parse.text[text].split("<p>");
//                 var pText = "";

//                 for (p in text) {
//                     //Remove html comment
//                     text[p] = text[p].split("<!--");
//                     if (text[p].length > 1) {
//                         text[p][0] = text[p][0].split(/\r\n|\r|\n/);
//                         text[p][0] = text[p][0][0];
//                         text[p][0] += "</p> ";
//                     }
//                     text[p] = text[p][0];

//                     //Construct a string from paragraphs
//                     if (text[p].indexOf("</p>") == text[p].length - 5) {
//                         var htmlStrip = text[p].replace(/<(?:.|\n)*?>/gm, '') //Remove HTML
//                         var splitNewline = htmlStrip.split(/\r\n|\r|\n/); //Split on newlines
//                         for (newline in splitNewline) {
//                             if (splitNewline[newline].substring(0, 11) != "Cite error:") {
//                                 pText += splitNewline[newline];
//                                 pText += "\n";
//                             }
//                         }
//                     }
//                 }
//                 pText = pText.substring(0, pText.length - 2); //Remove extra newline
//                 pText = pText.replace(/\[\d+\]/g, ""); //Remove reference tags (e.x. [1], [4], etc)
//                 document.getElementById('textarea').value = pText
//                 //document.getElementById('div_text').innerHTML = pText
//             }
//         });
// }