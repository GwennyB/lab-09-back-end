'use strict';

// application dependencies
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');

const app = express();

app.use(cors());

// get application constants
require('dotenv').config();
const PORT = process.env.PORT;

// DATABASE CONFIG
const client = new pg.Client(process.env.DATABASE_URL);
client.connect();
client.on('error', err => console.error(err));

// set routes
app.get(('/location'), getLatLng);
app.get(('/weather'), getWeather);
app.get(('/yelp'), getYelp); // OK
app.get(('/movies'), getMovies);
app.get(('/meetups'), getMeetups); // OK
app.get(('/trails'), getTrails); // OK


// HELPER, LOCATION: define cache handling
function getLatLng (request, response) {
  const handler = {
    query: request.query.data,
    cacheHit: (results) => {
      response.send(results.rows[0]);
    },
    cacheMiss: () => {
      Location.fetch(request.query.data)
        .then( results => response.send(results));
    }
  };
  Location.lookupLocation(handler);
}

// HELPER, LOCATION: db lookup, hit/miss call
Location.lookupLocation = (handler) => { 
// query cache
  const SQL = `SELECT * FROM locations WHERE search_query=$1`;
  const values = [handler.query];
  return client.query( SQL, values)
    .then( results => {
      // if results, then return results to hit
      if (results.rowCount > 0) {
        handler.cacheHit(results);
        // if no results, then point to miss
      } else {
        handler.cacheMiss();
      }
    })
    // if bad query, then point to error handler
    .catch( error => handleError(error) );
};

// HELPER, LOCATION: constructor
function Location (data, query) {
  this.search_query = query,
  this.formatted_query = data.formatted_address,
  this.latitude = data.geometry.location.lat,
  this.longitude = data.geometry.location.lng
}

// HELPER, LOCATION: fetch location from API
Location.fetch = (query) => {
  // API call
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${process.env.GEOCODE_API_KEY}`;
  return superagent.get(url)
    .then( apiData => {
      // if no data: throw error
      if (!apiData.body.results.length) {
        throw 'No Data from API'
        // if data: save, send to front
      } else {
        let location = new Location (apiData.body.results[0], query);
        return location.saveToDB()
          .then( result => {
            location.id = result.rows[0].id;
            return location;
          })
          .catch( error => handleError(error));
      }
    })
    .catch( error => handleError(error));

};

// HELPER, LOCATION: save API data to DB
Location.prototype.saveToDB = function() {
  const SQL = `
    INSERT INTO locations
      (search_query,formatted_query,latitude,longitude)
      VALUES($1,$2,$3,$4)
      RETURNING id
  `;
  let values = Object.values(this);
  return client.query( SQL,values );
};


// GENERIC HELPERS
// helper object constructor
function Feature (request) {
  this.location_id = request.query.data.search_query || 0;
  this.query = request.query.data;
}

// shared DB
Feature.prototype.lookupFeature = function () {
  // query cache
  const SQL = `SELECT * FROM ${this.tableName} WHERE location_id=$1`;
  const values = [this.location_id];
  return client.query( SQL, values)
    .then( results => {
      // if results, then return results to hit
      if (results.rowCount > 0) {
        console.log(`FEATURE: ${this.tableName}`);
        if(parseInt(results.rows[0].expiration) > parseInt(Date.now())){
          console.log('fresh: run cacheHit');
          this.cacheHit(results);
        } else {
          console.log('expired: ',new Date(parseInt(results.rows[0].expiration)));
          console.log('run cacheMiss');
          this.expire(this.location_id);
          this.cacheMiss();
        }
        // if no results, then point to miss
      } else {
        console.log('no results: run cacheMiss');
        this.cacheMiss();
      }
    })
    // if bad query, then point to error handler
    .catch( error => handleError(error) );
}

Feature.prototype.expire = function(id) {
  const SQL = `DELETE FROM ${this.tableName} WHERE location_id=$1`;
  const values = [id];

  client.query(SQL,values);
}

// HELPERS, TRAILS 
function getTrails (request, response) {
  const handler = new Feature (request);
  handler.cacheHit = (results) => {
    console.log('Trails cacheHit');
    response.send(results.rows);
  }
  handler.cacheMiss = () => {
    console.log('Trails cacheMiss');
    Trail.fetch(request.query)
      .then( results => response.send(results))
      .catch( error => handleError(error));
  }
  handler.tableName = 'trails',
  handler.lookupFeature();
}

function Trail (data,locID) {
  this.location_id = locID,
  this.expiration = Date.now() + 21600000,  // expire after 6 hours
  this.name = data.name,
  this.location = data.location,
  this.stars = data.stars,
  this.star_votes = data.starVotes,
  this.summary = data.summary,
  this.trail_url = data.url,
  this.conditions = `${data.conditionStatus}.  ${data.conditionDetails}` || 'No conditions reported.',
  this.condition_date = data.conditionDate.split(' ')[0] || '',
  this.condition_time = data.conditionDate.split(' ')[1] || ''
}

Trail.fetch = (query) => {
  const url = `https://www.hikingproject.com/data/get-trails?lat=${query.data.latitude}&lon=${query.data.longitude}&key=${process.env.HIKING_API_KEY}`;
  return superagent.get(url)
    .then( apiData => {
      // if no data: throw error
      if (!apiData.body.trails) {
        throw 'No Data from API'
        // if data: save, send to front
      } else {
        const trails = apiData.body.trails.map(trail => {
          const thisTrail = new Trail(trail,query.data.search_query);
          thisTrail.saveToDB();
          return thisTrail;
        })
        return trails;
      }
    })
    .catch( error => handleError(error));
};

Trail.prototype.saveToDB = function() {
  const SQL = `INSERT INTO trails (location_id,expiration,name,location,length,stars,star_votes,summary,trail_url,conditions,condition_date,condition_time) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`;
  let values = [this.location_id,this.expiration,this.name,this.location,this.length,this.stars,this.star_votes,this.summary,this.trail_url,this.conditions,this.condition_date,this.condition_time];
  let savedTrail = client.query( SQL,values );
  return savedTrail;
};



// HELPERS, MEETUPS
function getMeetups (request, response) {
  const handler = new Feature (request);
  handler.cacheHit = (results) => {
    console.log('Meetups cacheHit');
    response.send(results.rows);
  }
  handler.cacheMiss = () => {
    console.log('Meetups cacheMiss');
    Meetup.fetch(request.query)
      .then( results => response.send(results))
      .catch( error => handleError(error));
  }
  handler.tableName = 'meetups',
  handler.lookupFeature();
}

function Meetup (data,locID) {
  this.location_id = locID,
  this.expiration = Date.now() + 86400000,
  this.link = data.link,
  this.name = data.name,
  this.creation_date = new Date(data.created).toDateString(),
  this.host = data.group.name
}

Meetup.fetch = (query) => {
  const url = `https://api.meetup.com/find/upcoming_events?key=${process.env.MEETUP_API_KEY}&lon=${query.data.longitude}&lat=${query.data.latitude}`;
  return superagent.get(url)
    .then( apiData => {
      // if no data: throw error
      if (!apiData.body.events) {
        throw 'No Data from API'
        // if data: save, send to front
      } else {
        const meetups = apiData.body.events.map(meetup => {
          const thisMeetup = new Meetup(meetup,query.data.search_query);
          thisMeetup.saveToDB();
          return thisMeetup;
        })
        return meetups;
      }
    })
    .catch( error => handleError(error));
};

Meetup.prototype.saveToDB = function() {
  const SQL = `INSERT INTO meetups (location_id,expiration,link,name,creation_date,host) VALUES($1,$2,$3,$4,$5,$6)`;
  let values = [this.location_id,this.expiration,this.link,this.name,this.creation_date,this.host];
  let savedMeetup = client.query( SQL,values );
  return savedMeetup;
};
 
// HELPERS, WEATHER
// build weather handler
function getWeather (request, response) {
  const handler = new Feature (request);
  handler.cacheHit = (results) => {
    console.log('Weather cacheHit');
    response.send(results.rows);
  }
  handler.cacheMiss = () => {
    console.log('Weather cacheMiss');
    Weather.fetch(request.query)
      .then( results => response.send(results))
      .catch( error => handleError(error));
  }
  handler.tableName = 'weathers',
  handler.lookupFeature();
}

// weather constructor
function Weather(weatData, locID) {
  this.location_id = locID;
  this.expiration = Date.now() + 10800000 // expire after 3 hours
  this.forecast = weatData.summary;
  this.time = new Date(weatData.time * 1000).toDateString();
}

// weather API request
Weather.fetch = function(query) {
  // API call
  const url = `https://api.darksky.net/forecast/${process.env.DARKSKY_API_KEY}/${query.data.latitude},${query.data.longitude}`;
  return superagent.get(url)
    .then( apiData => {
      // if no data: throw error
      if (!apiData.body.daily.data.length) {
        throw 'No Data from API'
        // if data: save, send to front
      } else {
        const weather = apiData.body.daily.data.map( day => {
          const thisWeather = new Weather(day, query.data.search_query);
          thisWeather.saveToDB();
          return thisWeather;
        })
        return weather;
      }
    })
    .catch( error => handleError(error));

};

// weather data cache
Weather.prototype.saveToDB = function() {
  const SQL = `INSERT INTO weathers (location_id,expiration,forecast,time) VALUES ($1,$2,$3,$4)`;
  let values = [this.location_id,this.expiration,this.forecast,this.time];
  return client.query( SQL,values );
};



// HELPERS, YELP
function getYelp (request, response) {
  const handler = new Feature (request);
  handler.cacheHit = (results) => {
    console.log('Yelps cacheHit');
    response.send(results.rows);
  }
  handler.cacheMiss = () => {
    console.log('Yelps cacheMiss');
    Yelp.fetch(request.query)
      .then( results => response.send(results))
      .catch( error => handleError(error));
  }
  handler.tableName = 'yelps',
  handler.lookupFeature();
}

function Yelp (data,locID) {
  this.location_id = locID,
  this.expiration = Date.now() + 86400000, // expire after 1 day
  this.name = data.name,
  this.image_url = data.image_url,
  this.price = data.price,
  this.rating = data.rating,
  this.url = data.url
}

Yelp.fetch = (query) => {
  const url = `https://api.yelp.com/v3/businesses/search?location=${query.data.search_query}`;
  return superagent.get(url).set('Authorization', `Bearer ${process.env.YELP_API_KEY}`)
    .then( apiData => {
      // if no data: throw error
      if (!apiData.body.businesses.length) {
        throw 'No Data from API'
        // if data: save, send to front
      } else {
        const yelps = apiData.body.businesses.map(biz => {
          const thisYelp = new Yelp(biz,query.data.search_query);
          thisYelp.saveToDB();
          return thisYelp;
        })
        return yelps;
      }
    })
    .catch( error => handleError(error));
};

Yelp.prototype.saveToDB = function() {
  const SQL = `INSERT INTO yelps (location_id,expiration,name,image_url,price,rating,url) VALUES($1,$2,$3,$4,$5,$6,$7)`;
  let values = [this.location_id,this.expiration,this.name,this.image_url,this.price,this.rating,this.url];
  return client.query( SQL,values )
};


// HELPERS, MOVIES
function getMovies (request, response) {
  const handler = new Feature (request);
  handler.cacheHit = (results) => {
    console.log('Movies cacheHit');
    response.send(results.rows);
  }
  handler.cacheMiss = () => {
    console.log('Movies cacheMiss');
    Movie.fetch(request.query)
      .then( results => response.send(results))
      .catch( error => handleError(error));
  }
  handler.tableName = 'movies',
  handler.lookupFeature();
}

function Movie (data,locID) {
  this.location_id = locID,
  this.expiration = Date.now() + 604800000 // expire after 1 week
  this.title = data.title,
  this.overview = data.overview.substring(0,255),
  this.average_votes = data.vote_average,
  this.total_votes = data.vote_count,
  this.image_url = `https://image.tmdb.org/t/p/w200_and_h300_bestv2/${data.poster_path}`,
  this.popularity = data.popularity,
  this.released_on = data.release_date
}
  
Movie.fetch = (query) => {
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.TMDB_API_KEY}&query=${query.data.search_query}`;
  return superagent.get(url)
    .then( apiData => {
      // if no data: throw error
      if (!apiData.text) {
        throw 'No Data from API'
        // if data: save, send to front
      } else {
        let parsedData = JSON.parse(apiData.text);
        let allMovies = parsedData.results.map( rawMovie => {
          let thisMovie = new Movie (rawMovie,query.data.search_query);
          thisMovie.saveToDB();
          return thisMovie;
        });
        return allMovies;
      }
    })
};

Movie.prototype.saveToDB = function() {
  const SQL = `INSERT INTO movies (location_id,expiration,title,overview,average_votes,total_votes,image_url,popularity,released_on)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`;
  let values = [this.location_id,this.expiration,this.title,this.overview,this.average_votes,this.total_votes,this.image_url,this.popularity,this.released_on];
  let savedMovie = client.query( SQL,values );
  return savedMovie;
};
  
  

// error handler
function handleError (error, response) {
  // console.error(error);
  if(response) response.status(500).send('Sorry, something went wrong.');
}

// open port
app.listen(PORT, () => {
  console.log(`listening on ${PORT}`);
})
