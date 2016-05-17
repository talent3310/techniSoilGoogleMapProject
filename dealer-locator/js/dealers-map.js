var DEALER_MAP = {};
var humanPos = {};

function initMap() {
    DEALER_MAP.init();
    $("#search_btn").bind("click", function() {
        var e = jQuery.Event("keyup");
        e.which = 13; // # Some key code value
        e.keyCode = 13
        $("#search_location").focus();
        $("#search_location").trigger(e);
    });
}

DEALER_MAP.init = function() {
    this.map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 34.202248, lng: -119.206555 },
        zoom: 6,
        mapTypeControl: false,
        scaleControl: false,
        scrollwheel: false
    });
    humanPos.lat = 34.202248;
    humanPos.lng = -119.206555;
    this.infoWindow = new google.maps.InfoWindow({ map: this.map });

    // Try HTML5 geolocation.
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                var pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                DEALER_MAP.map.setCenter(pos);
                humanPos = pos;
            },
            function() {
                DEALER_MAP.handleLocationError(true, DEALER_MAP.infoWindow, DEALER_MAP.map.getCenter());
            }
        );
    } else {
        // Browser doesn't support Geolocation
        this.handleLocationError(false, this.infoWindow, this.map.getCenter());
    }

    this.searchBox = new google.maps.places.SearchBox(document.getElementById('search_location'));

    google.maps.event.addListener(this.searchBox, 'places_changed', function() {
        var places = DEALER_MAP.searchBox.getPlaces();

        if (places.length == 0) {
            return;
        }

        var bounds = new google.maps.LatLngBounds();

        for (var i = 0, place; place = places[i]; i++) {
            bounds.extend(place.geometry.location);
        }

        DEALER_MAP.map.fitBounds(bounds);
        DEALER_MAP.map.setZoom(8);
    });

    this.map.addListener("bounds_changed", this.loadDealers);
    this.map.addListener("center_changed", this.loadDealers);
    this.map.addListener("zoom_changed", this.loadDealers);
}

DEALER_MAP.handleLocationError = function(browserHasGeolocation, infoWindow, pos) {
    if (browserHasGeolocation) {
        var content = "Error: The Geolocation service failed.";
    } else {
        var content = "Error: Your browser doesn't support geolocation.";
    }

    //this.map.setCenter(pos);
    //humanPos = pos;

    this.infoWindow.setPosition(pos);
    this.infoWindow.setContent(content);
}

DEALER_MAP.loadDealers = function() {
    if (this.timer) {
        clearTimeout(this.timer);
    }

    var images = [{
        url: 'dealer-locator/images/pink.ico',
        size: new google.maps.Size(20, 32),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(0, 32),
    }, {
        url: 'dealer-locator/images/blue.png',
        size: new google.maps.Size(20, 32),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(0, 32),
    }];

    if (DEALER_MAP.dealers == null) {
        $.getJSON("dealers.json", function(dealers) {
            DEALER_MAP.dealers = dealers;
            DEALER_MAP.timer = setTimeout("DEALER_MAP.drawDealers()", 1000);
        });
    } else {
        DEALER_MAP.timer = setTimeout("DEALER_MAP.drawDealers()", 1000);
    }
}

DEALER_MAP.drawDealers = function() {
    var cur_bounds = this.map.getBounds();

    var total_count = this.dealers.length;

    var nearby_count = 0;
    //this.dealer_locators = new Array();

    $("#info_list").empty();
    for (i = 0; i < total_count; i++) {
        var dealer = this.dealers[i];

        var pos = { lat: Number(dealer.latitude), lng: Number(dealer.longitude) };
        var latlng = new google.maps.LatLng(pos.lat, pos.lng);

        if (cur_bounds.contains(latlng)) {
            this.dealer_locator(dealer, nearby_count + 1);

            nearby_count++;
        }
        if (this.bDraw) continue;

        var image;
        var zIndex;

        if (dealer.preferred == null || dealer.preferred == "") {
            image = "dealer-locator/images/red_small.png";
            zIndex = 1;
        } else {
            image = "dealer-locator/images/blue_small.png";
            zIndex = 2;
        }

        var marker = new google.maps.Marker({
            position: pos,
            map: DEALER_MAP.map,
            icon: image,
            zIndex: zIndex,
            dealer: dealer,
        });

        marker.addListener('click', function() {
            var dealer = this.dealer;
            var contentString = "<div id='infoWindow'>" +
                " <span class='dealer_name'>" + dealer.name + "</span><br/>" +
                " <span class='dealer_phone'>" + dealer.phone + "</span><br/>" +
                " <a href='" + dealer.website + "'>" + dealer.website + "</a><br/>" +
                " <span class='dealer_address'>" + dealer.address + " " + dealer.address2 + "</span><br/>" +
                " </div>";
            DEALER_MAP.infoWindow.setContent(contentString);
            DEALER_MAP.infoWindow.open(DEALER_MAP.map, this);
        });
    }

    $("#search_result").html(nearby_count + " Dealers Found Near You");
    $("#search_result_under").html(nearby_count + " Dealers Found Near You...");

    this.bDraw = true;
}

var rad = function(x) {
    return x * Math.PI / 180;
};

var getDistance = function(p1, p2) {
    var R = 6378137; // Earth’s mean radius in meter
    var dLat = rad(p2.lat() - p1.lat());
    var dLong = rad(p2.lng() - p1.lng());
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(rad(p1.lat())) * Math.cos(rad(p2.lat())) *
        Math.sin(dLong / 2) * Math.sin(dLong / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d; // returns the distance in meter
};

DEALER_MAP.dealer_locator = function(dealer, i) {
    var pos = { lat: Number(dealer.latitude), lng: Number(dealer.longitude) };
    var p1 = new google.maps.LatLng(pos.lat, pos.lng);
    var p2 = new google.maps.LatLng(humanPos.lat, humanPos.lng);
    var distance = (getDistance(p1, p2) / 1852).toFixed(3);
    var str = "<div class='__info'><div class='__info-header' >" + i + "." + "<span>" + dealer.name + "</span>" + "<span class='__info-header-second'>(with in " + distance + "miles of you)</span></div>" + "<div class='__info-body'>" + dealer.address + " | " + dealer.phone + " | " + "<a href='" + dealer.website + "'>" + dealer.website + "</a>" + "<div class='__info-body-second' id='__info-select" + i + "'>" + "<span class='__info-body-second-tag'>|</span>" + "<a href='#'><img src='./dealer-locator/images/select.png'>&nbsp;" + "<span class='__info-body-second-tag2'>View on map</span></a></div></div></div>";

    $("#info_list").append(str);

    $("#__info-select" + i).bind("click", function() {
        DEALER_MAP.map.setCenter(pos);
        //DEALER_MAP.map.setZoom(4);
        var contentString_info = "<div id='infoWindow'>" +
            " <span  class='dealer_name'>" + dealer.name + "</span><br/>" +
            " <span  class='dealer_phone'>" + dealer.phone + "</span><br/>" +
            " <a href='" + dealer.website + "'>" + dealer.website + "</a><br/>" +
            " <span class='dealer_address'>" + dealer.address + " " + dealer.address2 + "</span><br/>" +
            " </div>";
        DEALER_MAP.infoWindow.setContent(contentString_info);
        DEALER_MAP.infoWindow.setPosition(pos);
        DEALER_MAP.infoWindow.open(DEALER_MAP.map);
    });
}
