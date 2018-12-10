DROP TABLE IF EXISTS locations;
DROP TABLE IF EXISTS weathers;
DROP TABLE IF EXISTS movies;
DROP TABLE IF EXISTS yelps;
DROP TABLE IF EXISTS meetups;
DROP TABLE IF EXISTS trails;

CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  expiration NUMERIC(20),
  search_query VARCHAR(255),
  formatted_query VARCHAR(255),
  latitude NUMERIC(8,6),
  longitude NUMERIC(9,6)
);

CREATE TABLE weathers (
  id SERIAL PRIMARY KEY,
  expiration NUMERIC(20),
  location_id VARCHAR(20),
  forecast VARCHAR(255),
  time VARCHAR(20)
);

CREATE TABLE movies (
  id SERIAL PRIMARY KEY,
  expiration NUMERIC(20),
  location_id VARCHAR(20),
  title VARCHAR(255),
  overview VARCHAR(255),
  average_votes NUMERIC(3,1),
  total_votes NUMERIC(4,0),
  image_url VARCHAR(255),
  popularity NUMERIC(5,3),
  released_on VARCHAR(255)
);

CREATE TABLE yelps (
  id SERIAL PRIMARY KEY,
  expiration NUMERIC(20),
  location_id VARCHAR(20),
  name VARCHAR(255),
  image_url VARCHAR(255),
  price VARCHAR(5),
  rating NUMERIC(2,1),
  url VARCHAR(255)
);

CREATE TABLE meetups (
  id SERIAL PRIMARY KEY,
  expiration NUMERIC(20),
  location_id VARCHAR(20),
  link VARCHAR(255),
  name VARCHAR(255),
  creation_date VARCHAR(20),
  host VARCHAR(255)
);

CREATE TABLE trails (
  id SERIAL PRIMARY KEY,
  expiration NUMERIC(20),
  location_id VARCHAR(20),
  name VARCHAR(255),
  location VARCHAR(255),
  length NUMERIC (5,2),
  stars NUMERIC(3,1),
  star_votes NUMERIC(5),
  summary VARCHAR(255),
  trail_url VARCHAR(255),
  conditions VARCHAR(255),
  condition_date VARCHAR(10),
  condition_time VARCHAR(10)
);
