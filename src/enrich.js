#!/usr/bin/env node

"use strict";

// ---------------------------------------------------------------------------
// Try and resolve entities on Wikipedia.
// ---------------------------------------------------------------------------

const fs      = require('fs');
const qs      = require('querystring');
const request = require('sync-request');
const cheerio = require('cheerio');

// the input file with the entities
const INFILE = './data/swapi.json';
const DATA   = JSON.parse(fs.readFileSync(INFILE, 'utf-8'));

// turn a string into red (for the interactive console)
function red(s)
{
    return '\u001b[31m' + s + '\u001b[39m'
}

// turn a string into green (for the interactive console)
function green(s)
{
    return '\u001b[32m' + s + '\u001b[39m'
}

// turn a string into yellow (for the interactive console)
function yellow(s)
{
    return '\u001b[33m' + s + '\u001b[39m'
}

// display an error on stderr, with a message and a serialized object
function error(msg, obj)
{
    console.warn(red('ERROR') + ': ' + msg);
    console.warn(JSON.stringify(obj));
}

// get one HTTP resource as JSON
function get(url)
{
    return request('GET', url).getBody('utf-8');
}

// get the one page on the topic at Wikipedia
function pediaPage(name)
{
    // pages to ignore, do not resolve properly
    if ( name === 'Bossk'        ) { return; }
    if ( name === 'Kamino'       ) { return; }
    if ( name === 'Rey'          ) { return; }
    if ( name === 'Utapau'       ) { return; }
    if ( name === 'Rodia'        ) { return; }
    if ( name === 'Socorro'      ) { return; }
    if ( name === 'Cerea'        ) { return; }
    if ( name === 'Dorin'        ) { return; }
    if ( name === 'Serenno'      ) { return; }
    if ( name === 'Concord Dawn' ) { return; }
    if ( name === 'Zolan'        ) { return; }
    if ( name === 'Shili'        ) { return; }
    if ( name === 'Mon Calamari' ) { return; }
    if ( name === 'Dug'          ) { return; }
    if ( name === 'Aleena'       ) { return; }
    if ( name === 'Cerean'       ) { return; }
    if ( name === 'Zabrak'       ) { return; }
    if ( name === 'Sand Crawler' ) { return; }
    if ( name === 'Scimitar'     ) { return; }

    // "manual" resolution
    if ( name === 'BB8'   ) { return 'BB-8'; }
    if ( name === 'Finn'  ) { return 'FN-2187'; }
    if ( name === 'Endor' ) { return 'Endor_(Star_Wars)'; }
    if ( name === 'Hutt'  ) { return 'Hutt_(Star_Wars)'; }
    if ( name === 'Droid' ) { return 'Droid_(robot)'; }
    
    // use WP api to resolve the page
    const url   = 'https://en.wikipedia.org/w/api.php'
          + '?format=json&action=query&redirects&titles='
          + qs.escape(name);
    const resp  = JSON.parse(get(url));
    const pages = resp.query.pages;
    if ( ! pages ) {
        error('no query.pages in response for ' + name, resp);
    }
    const keys = Object.keys(pages);
    if ( keys.length !== 1 ) {
        error('not exactly one page for ' + name, pages);
    }
    const page = pages[keys[0]];
    if ( page.ns !== 0 ) {
        error('page not in ns 0 for ' + name, page);
    }
    if ( page.missing === '' ) {
        return;
    }
    if ( ! page.pageid ) {
        error('no page id for ' + name, page);
    }

    // pages to ignore (resolve to list pages)
    if ( page.pageid ===  303197 ) { return; } // List of Star Wars characters
    if ( page.pageid ===   50793 ) { return; } // Star Wars: Episode I – The Phantom Menace
    if ( page.pageid ===  288515 ) { return; } // Clone Wars (Star Wars)
    if ( page.pageid === 4977580 ) { return; } // Akbar (disambiguation)
    if ( page.pageid ===  242925 ) { return; } // Skywalker family
    if ( page.pageid === 1666775 ) { return; } // List of Star Wars planets and moons
    if ( page.pageid === 3938702 ) { return; } // List of Star Wars air, aquatic, and ground vehicles
    if ( page.pageid === 3939384 ) { return; } // List of Star Wars starfighters
    if ( page.pageid === 4042821 ) { return; } // List of Star Wars spacecraft
    if ( page.title.startsWith('List of Star Wars species') ) { return; }

    //console.warn(page.pageid);
    return page.title;
}

// get the description from the Wikipedia page
function pediaDesc(name)
{
    const url  = 'https://en.wikipedia.org/wiki/' + qs.escape(name) + '?action=render';
    const html = get(url);
    const $    = cheerio.load(html);
    let elem = $('.mw-parser-output').children().first();
    while ( ! elem.is('p') ) {
        elem = elem.next();
    }
    let res = [];
    while ( elem.is('p') ) {
        let text = elem.text();
        if ( text ) {
            res.push(text);
        }
        elem = elem.next();
    }
    return res;
}

function enrich(entity)
{
    const name = entity.name || entity.title;
    if ( ! name ) {
        error('entity has no name', entity);
    }
    if ( name === 'unknown' ) {
        // ignore the planet with name "unknown"
        return;
    }
    if ( entity.desc ) {
        error('entity already has a desc', entity);
    }
    const page = pediaPage(name);
    if ( page ) {
        console.warn(green(name) + ' -> ' + page);
        const desc = pediaDesc(page);
        desc.forEach(desc => {
            console.warn(desc.length > 73 ? (desc.slice(0, 70) + '...') : desc);
        });
        console.warn();
        entity.desc = desc;
    }
}

const sections = [
    'people',
    'planets',
    'films',
    'species',
    'vehicles',
    'starships'
];

sections.forEach(sect => {
    console.warn('** ' + yellow(sect));
    console.warn();
    DATA[sect].forEach(enrich);
});

// print the enriched data
console.log(JSON.stringify(DATA));
