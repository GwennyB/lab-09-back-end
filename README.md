# lab-09-back-end
Lab 09: Cache Invalidation

### Feature #1: Retrieve Meetup information

Estimate of time needed to complete: 30min

Start time: 9:53am

Finish time: 10:45am

Actual time needed to complete: 52min

### Feature #2: Retrieve trail information

Estimate of time needed to complete: 30min

Start time: 10:50am

Finish time: 11:20am

Actual time needed to complete: 30min

### Feature #: Cache invalidation

Estimate of time needed to complete: 2hrs

Start time: __________

Finish time: __________

Actual time needed to complete: __________




# zubucity-12-07.herokuapp.com

**Author**: Gwen Zubatch
**Version**: 4.0.0 

## Overview
This server application accepts a location (city) query string from a client and returns objects with up-to-date SQL-DB or API-sourced map, weather, restaurants, and movies data for that location.

## Getting Started
Build an Express server, and load CORS, SUPERAGENT, PG and DOTENV. Use PORT for port (default: 3000). Create '/location' route to accept and process query from client. 

## Architecture
CORS: This application relies on API sources for which CORS provides access management. Aquire API keys from:
  https://developers.google.com/maps/documentation/geocoding/start
  https://darksky.net/dev/docs
  https://www.yelp.com/developers/documentation/v3/business_search
  https://www.themoviedb.org/documentation/api
API keys may not be published; load DOTENV and include key vars in .env. 
Port uses environment variable PORT (default: 3000); set PORT in .env (if using a 3rd-party domain host that sets the port).
Location route (/location) request object from client-side AJAX GET request. Response is constructed response object containing:
  search_query:
  formatted_query:
  latitude:
  longitude:
Returns status 500 and error message if query returns no results.
Weather route (/weather) requests object from same client-side AJAX GET request. Response is constructed in response object containing:
  forecast: 
  time:
Yelp route (/yelp) requests object from same client-side AJAX GET request. Response is constructed in response object containing:
  name: 
  image_url:
  price:
  rating:
  url:
Movies route (/movies) requests object from same client-side AJAX GET request. Response is constructed in response object containing:
  title:
  overview:
  average_votes:
  total_votes:
  image_url:
  popularity:
  released_on:
Caching: All features use DB='explorer' for remote caching. Cache is checked for expiration.

## Change Log
12-04-2018 10:53am - Application now has a fully-functional express server, with a GET route for the location resource.
12-04-2018 12:18pm - Application now has a GET route for the weather resource.
12-04-2018 1:45pm - Application now has error response for Geocoding response other than "OK". Deployed at https://zubucity.herokuapp.com/.
12-05-2018 1:00pm - Application now uses constructors to return consistently formatted objects for each feature.
12-05-2018 2:45pm - Application now returns location object sourced by Google Geocoding API, weather object sourced by Dark Sky API, and restaurants object sourced by Yelp API.
12-05-2018 5:45pm - Application now returns movies data sourced by TMDb API. Deployed at https://zubucity-12-05.herokuapp.com/.
12-06-2018 10:30am - Application is now connected to SQL DB ('explorer'), which contains tables for locations, weathers, yelps, and movies.
12-06-2018 10:45pm - Application features all use DB caching.
12-07-2018 10:45am - Application now offers location-based meetup data with caching.
12-07-2018 11:20am - Application now offers location-based hiking data with caching.

## Credits and Collaborations
Collaborative effort by:
  Clarice Costello: https://github.com/c-costello
  Ahmad Ali: https://github.com/ahmad62597
  Gwen Zubatch: https://github.com/GwennyB