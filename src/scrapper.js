#!/usr/bin/env node

"use strict";

// ---------------------------------------------------------------------------
// Retrieve all entities and aggregate them in one single JSON object.
// ---------------------------------------------------------------------------

var request = require('sync-request');

// the main entry point
var API = 'http://swapi.co/api/';

// turn a string into green (for the interactive console)
function green(s)
{
    return '\u001b[32m' + s + '\u001b[39m'
}

// get one HTTP resource
function get(url)
{
    console.warn(green('fetch') + ' ' + url);
    return JSON.parse(
        request('GET', url)
            .getBody('utf-8'));
}

// get all results posisbly over multiple pages
function all(url)
{
    var page = get(url);
    if ( page.next ) {
        return page.results.concat(
            all(page.next));
    }
    else {
        return page.results;
    }
}

// the overall result
var res = {};

// the root objects
res.root = get(API);

// get all objects of all types
for ( var p in res.root ) {
    res[p] = all(res.root[p]);
}

// print the result
console.log(JSON.stringify(res));
