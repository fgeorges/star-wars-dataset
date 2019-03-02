#!/usr/bin/env node

"use strict";

// ---------------------------------------------------------------------------
// Transform the enriched data file to several XML files.
// ---------------------------------------------------------------------------

const fs = require('fs');

// the input file with the entities
const JSONDIR = './json/';
const TTLDIR  = './ttl/';
const XMLDIR  = './xml/';
const INFILE  = './data/enriched.json';
const DATA    = JSON.parse(fs.readFileSync(INFILE, 'utf-8'));

// turn a string into yellow (for the interactive console)
function yellow(s)
{
    return '\u001b[33m' + s + '\u001b[39m'
}

function string(file, name, content)
{
    fs.writeSync(file, '   "' + name + '": "' + content.replace(/"/g, '\\"') + '"');
}

function number(file, name, content)
{
    fs.writeSync(file, '   "' + name + '": ' + content);
}

function array(file, name, content)
{
    if ( ! content.length ) {
        fs.writeSync(file, '   "' + name + '": []');
    }
    else {
        fs.writeSync(file, '   "' + name + '": [\n');
        content.forEach((item, i) => {
            fs.writeSync(file, '      "' + item.replace(/"/g, '\\"') + '"');
            endProp(file, i, content.length);
        });
        fs.writeSync(file, '   ]');
    }
}

function endProp(file, i, len)
{
    if ( i + 1 < len ) {
        fs.writeSync(file, ',');
    }
    fs.writeSync(file, '\n');
}

function triple(file, rsrc, prop, content)
{
    const numbers = [
        'sw:average_height',
        'sw:average_lifespan',
        'sw:cargo_capacity',
        'sw:consumables',
        'sw:cost_in_credits',
        'sw:crew',
        'sw:diameter',
        'sw:episode_id',
        'sw:hyperdrive_rating',
        'sw:length',
        'sw:max_atmosphering_speed',
        'sw:orbital_period',
        'sw:passengers',
        'sw:rotation_period'
    ];
    if ( prop === 'title' || prop === 'name' ) {
	prop = 'rdfs:label';
    }
    else {
	prop = 'sw:' + prop;
    }
    if ( prop === 'sw:characters' ) {
	fs.writeSync(file, rsrc + '  sw:character  sw:people-' + content.slice(27).slice(0, -1) + ' .\n');
    }
    else if ( prop === 'sw:films' ) {
	fs.writeSync(file, rsrc + '  sw:flim  sw:flim-' + content.slice(26).slice(0, -1) + ' .\n');
    }
    else if ( prop === 'sw:homeworld' ) {
	fs.writeSync(file, rsrc + '  sw:homeworld  sw:planet-' + content.slice(28).slice(0, -1) + ' .\n');
    }
    else if ( prop === 'sw:people' ) {
	fs.writeSync(file, rsrc + '  sw:people  sw:people-' + content.slice(27).slice(0, -1) + ' .\n');
    }
    else if ( prop === 'sw:pilots' ) {
	fs.writeSync(file, rsrc + '  sw:pilot  sw:people-' + content.slice(27).slice(0, -1) + ' .\n');
    }
    else if ( prop === 'sw:planets' ) {
	fs.writeSync(file, rsrc + '  sw:planet  sw:planet-' + content.slice(28).slice(0, -1) + ' .\n');
    }
    else if ( prop === 'sw:residents' ) {
	fs.writeSync(file, rsrc + '  sw:resident  sw:people-' + content.slice(27).slice(0, -1) + ' .\n');
    }
    else if ( prop === 'sw:species' ) {
	fs.writeSync(file, rsrc + '  sw:species  sw:species-' + content.slice(28).slice(0, -1) + ' .\n');
    }
    else if ( prop === 'sw:starships' ) {
	fs.writeSync(file, rsrc + '  sw:starship  sw:starship-' + content.slice(30).slice(0, -1) + ' .\n');
    }
    else if ( prop === 'sw:vehicles' ) {
	fs.writeSync(file, rsrc + '  sw:vehicle  sw:vehicle-' + content.slice(29).slice(0, -1) + ' .\n');
    }
    else if ( prop === 'sw:release_date' ) {
	fs.writeSync(file, `${rsrc}  ${prop}  "${content}"^^xs:date .\n`);
    }
    else if ( ['sw:created', 'sw:edited'].includes(prop) ) {
	fs.writeSync(file, `${rsrc}  ${prop}  "${content}"^^xs:dateTime .\n`);
    }
    else if ( numbers.includes(prop) && ! isNaN(content) ) {
	fs.writeSync(file, `${rsrc}  ${prop}  ${content} .\n`);
    }
    else if ( prop !== 'sw:url' && content.startsWith('http://swapi.co/api/') ) {
	throw new Error('Should not this be a resource link? - ' + prop);
    }
    else if ( /[\n\r]/.test(content) ) {
	const c = content.replace(/"""/g, '\\u0022\\u0022\\u0022');
	fs.writeSync(file, `${rsrc}  ${prop}  """${c}""" .\n`);
    }
    else {
	const c = content.replace(/"/g, '\\u0022');
	fs.writeSync(file, `${rsrc}  ${prop}  "${c}" .\n`);
    }
}

function elem(file, name, content)
{
    if ( typeof content === 'string' ) {
        content = content.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    }
    fs.writeSync(file, '   <' + name + '>' + content + '</' + name + '>\n');
}

function writeEntity(entity, dir, root)
{
    const num  = entity.url.split('/').slice(-2)[0];
    const rsrc = 'sw:' + root + '-' + num;
    const path = dir + '/' + num;
    console.warn(path);
    const json  = fs.openSync(JSONDIR + path + '.json', 'w');
    const ttl   = fs.openSync(TTLDIR  + path + '.ttl', 'w');
    const xml   = fs.openSync(XMLDIR  + path + '.xml',  'w');
    const clazz = root.slice(0, 1).toUpperCase() + root.slice(1);
    fs.writeSync(json, '{ "' + root + '": {\n');
    fs.writeSync(ttl,  '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n');
    fs.writeSync(ttl,  '@prefix sw:   <http://h2o.consulting/ns/star-wars#> .\n');
    fs.writeSync(ttl,  '@prefix xs:   <http://www.w3.org/2001/XMLSchema#> .\n\n');
    fs.writeSync(ttl,  rsrc + '  a  sw:' + clazz + ' .\n');
    fs.writeSync(xml,  '<' + root + ' xmlns="http://h2o.consulting/ns/star-wars">\n');
    const props = Object.keys(entity);
    props.forEach((prop, i) => {
        const val  = entity[prop];
        const type = typeof val;
        if ( val === 'unknown' || val === 'n/a' || val === null ) {
        }
        else if ( type === 'string' ) {
            string(json, prop, val);
            endProp(json, i, props.length);
            triple(ttl, rsrc, prop, val);
            elem(xml, prop, val);
        }
        else if ( type === 'number' ) {
            number(json, prop, val);
            endProp(json, i, props.length);
            triple(ttl, rsrc, prop, val);
            elem(xml, prop, val);
        }
        else if ( Array.isArray(val) ) {
            array(json, prop, val);
            endProp(json, i, props.length);
            val.forEach(v => triple(ttl, rsrc, prop, v));
            val.forEach(v => elem(xml, prop, v));
        }
        else {
            const str = JSON.stringify(entity);
            throw new Error('Unknown type for ' + prop + ' in ' + str);
        }
    });
    fs.writeSync(json, '}}\n');
    fs.writeSync(xml,  '</' + root + '>\n');
}

const sections = [
    [ 'people',    'people'   ],
    [ 'planets',   'planet'   ],
    [ 'films',     'film'     ],
    [ 'species',   'species'  ],
    [ 'vehicles',  'vehicle'  ],
    [ 'starships', 'starship' ]
];

sections.forEach(section => {
    const dir  = section[0];
    const root = section[1];
    console.warn('** ' + yellow(dir));
    DATA[dir].forEach(entity => writeEntity(entity, dir, root));
    console.warn();
});
