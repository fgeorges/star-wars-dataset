#!/usr/bin/env node

"use strict";

// ---------------------------------------------------------------------------
// Transform the enriched data file to several XML files.
// ---------------------------------------------------------------------------

const fs          = require('fs');
const {stringify} = require('csv-stringify/sync');

// the input file with the entities
const CSVDIR    = './csv/';
const JSONDIR   = './json/';
const MLSEMDIR  = './mlsem/';
const TTLDIR    = './ttl/';
const SINGLETTL = TTLDIR + 'star-wars-dataset.ttl';
const XMLDIR    = './xml/';
const INFILE    = './data/enriched.json';
const DATA      = JSON.parse(fs.readFileSync(INFILE, 'utf-8'));

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

function mltriple(file, rsrc, prop, content, type)
{
    fs.writeSync(file, `   <triple>\n`);
    // subject
    fs.writeSync(file, `      <subject>http://h2o.consulting/ns/star-wars#${rsrc}</subject>\n`);
    // predicate
    if ( prop === 'a' ) {
        fs.writeSync(file, `      <predicate>http://www.w3.org/1999/02/22-rdf-syntax-ns#type</predicate>\n`);
    }
    else if ( prop === 'title' || prop === 'name' ) {
        fs.writeSync(file, `      <predicate>http://www.w3.org/2000/01/rdf-schema#label</predicate>\n`);
    }
    else {
        fs.writeSync(file, `      <predicate>http://h2o.consulting/ns/star-wars#${prop}</predicate>\n`);
    }
    // object
    if ( type ) {
        fs.writeSync(file, `      <object datatype="http://www.w3.org/2001/XMLSchema#${type}">${content}</object>\n`);
    }
    else {
        fs.writeSync(file, `      <object>http://h2o.consulting/ns/star-wars#${content}</object>\n`);
    }
    fs.writeSync(file, `   </triple>\n`);
}

function triple(mlsem, ttl, singlettl, rsrc, prop, content, type)
{
    // different outputs for different cases
    const ref = (r) => {
        const target = r.type + '-' + content.slice(r.idx, -1);
        mltriple(mlsem, rsrc, r.pred, target);
	fs.writeSync(ttl,       `sw:${rsrc}  sw:${r.pred}  sw:${target} .\n`);
	fs.writeSync(singlettl, `sw:${rsrc}  sw:${r.pred}  sw:${target} .\n`);
    };
    const typed = (type) => {
        mltriple(mlsem, rsrc, prop, content, type);
	fs.writeSync(ttl,       `sw:${rsrc}  sw:${prop}  "${content}"^^xs:${type} .\n`);
	fs.writeSync(singlettl, `sw:${rsrc}  sw:${prop}  "${content}"^^xs:${type} .\n`);
    };
    const number = () => {
        mltriple(mlsem, rsrc, prop, content, /^[0-9]+$/.test(content) ? 'integer' : 'decimal');
	fs.writeSync(ttl,       `sw:${rsrc}  sw:${prop}  ${content} .\n`);
	fs.writeSync(singlettl, `sw:${rsrc}  sw:${prop}  ${content} .\n`);
    };
    const str = () => {
        mltriple(mlsem, rsrc, prop, content.replace(/&/g, '&amp;').replace(/</g, '&lt;'), 'string');
        const pred = prop === 'title' || prop === 'name'
            ? 'rdfs:label'
            : 'sw:' + prop;
        if ( /[\n\r]/.test(content) ) {
	    const c = content.replace(/"""/g, '\\u0022\\u0022\\u0022');
	    fs.writeSync(ttl,       `sw:${rsrc}  ${pred}  """${c}""" .\n`);
	    fs.writeSync(singlettl, `sw:${rsrc}  ${pred}  """${c}""" .\n`);
        }
        else {
	    const c = content.replace(/"/g, '\\u0022');
	    fs.writeSync(ttl,       `sw:${rsrc}  ${pred}  "${c}" .\n`);
	    fs.writeSync(singlettl, `sw:${rsrc}  ${pred}  "${c}" .\n`);
        }
    };

    // ref properties
    const refs = {
        characters: {pred: 'character', type: 'people',   idx: 27},
        films:      {pred: 'film',      type: 'film',     idx: 26},
        homeworld:  {pred: 'homeworld', type: 'planet',   idx: 28},
        people:     {pred: 'people',    type: 'people',   idx: 27},
        pilots:     {pred: 'pilot',     type: 'people',   idx: 27},
        planets:    {pred: 'planet',    type: 'planet',   idx: 28},
        residents:  {pred: 'resident',  type: 'people',   idx: 27},
        species:    {pred: 'species',   type: 'species',  idx: 28},
        starships:  {pred: 'starship',  type: 'starship', idx: 30},
        vehicles:   {pred: 'vehicle',   type: 'vehicle',  idx: 29}
    };

    // numeric properties
    const numbers = [
        'average_height',
        'average_lifespan',        // can be "indefinite"
        'cargo_capacity',          // can be "none"
        'cost_in_credits',
        'crew',
        'diameter',
        'episode_id',
        'hyperdrive_rating',       // decimal
        'length',                  // decimal, with "," for thousands
        'max_atmosphering_speed',  // there is one "1000km"
        'orbital_period',
        'passengers',
        'rotation_period'
    ];

    // output the triple
    const r = refs[prop];
    if ( r ) {
        ref(r);
    }
    else if ( prop === 'release_date' ) {
	typed('date');
    }
    else if ( ['created', 'edited'].includes(prop) ) {
	typed('dateTime');
    }
    else if ( type === 'number' ) {
        number();
    }
    else if ( numbers.includes(prop) ) {
        content = content.replace(',', '');
        if ( isNaN(content) ) {
            str();
        }
        else {
            number();
        }
    }
    else if ( prop !== 'url' && content.startsWith('http://swapi.co/api/') ) {
	throw new Error('Should not this be a resource link? - ' + prop);
    }
    else {
        str();
    }
}

function elem(file, name, content)
{
    if ( typeof content === 'string' ) {
        content = content.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    }
    fs.writeSync(file, '   <' + name + '>' + content + '</' + name + '>\n');
}

function writeEntity(entity, dir, root, singlettl, csv, rels)
{
    const num  = entity.url.split('/').slice(-2)[0];
    const rsrc = root + '-' + num;
    const path = dir + '/' + num;
    console.warn(path);
    const json  = fs.openSync(JSONDIR  + path + '.json', 'w');
    const mlsem = fs.openSync(MLSEMDIR + path + '.xml',  'w');
    const ttl   = fs.openSync(TTLDIR   + path + '.ttl',  'w');
    const xml   = fs.openSync(XMLDIR   + path + '.xml',  'w');
    const clazz = root[0].toUpperCase() + root.slice(1);
    fs.writeSync(json,  '{ "' + root + '": {\n');
    fs.writeSync(mlsem, '<triples xmlns="http://marklogic.com/semantics">\n');
    fs.writeSync(ttl,   '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n');
    fs.writeSync(ttl,   '@prefix sw:   <http://h2o.consulting/ns/star-wars#> .\n');
    fs.writeSync(ttl,   '@prefix xs:   <http://www.w3.org/2001/XMLSchema#> .\n\n');
    mltriple(mlsem, rsrc, 'a', clazz);
    fs.writeSync(ttl,       `sw:${rsrc}  a  sw:${clazz} .\n`);
    fs.writeSync(singlettl, `sw:${rsrc}  a  sw:${clazz} .\n`);
    fs.writeSync(xml,   '<' + root + ' xmlns="http://h2o.consulting/ns/star-wars">\n');
    const row   = [];
    const props = Object.keys(entity);
    props.forEach((prop, i) => {
        const val  = entity[prop];
        const type = typeof val;
        if ( val === 'unknown' || val === 'n/a' || val === null ) {
        }
        else if ( type === 'string' ) {
            string(json, prop, val);
            endProp(json, i, props.length);
            triple(mlsem, ttl, singlettl, rsrc, prop, val, type);
            elem(xml, prop, val);
            if ( ! rels.includes(prop) ) {
                row.push(val);
            }
        }
        else if ( type === 'number' ) {
            number(json, prop, val);
            endProp(json, i, props.length);
            triple(mlsem, ttl, singlettl, rsrc, prop, val, type);
            elem(xml, prop, val);
            if ( ! rels.includes(prop) ) {
                row.push(val);
            }
        }
        else if ( Array.isArray(val) ) {
            array(json, prop, val);
            endProp(json, i, props.length);
            val.forEach(v => triple(mlsem, ttl, singlettl, rsrc, prop, v, type));
            val.forEach(v => elem(xml, prop, v));
            if ( ! rels.includes(prop) ) {
                row.push(val.join('\n\n'));
            }
        }
        else {
            const str = JSON.stringify(entity);
            throw new Error(`Unknown type ${type} for ${prop} in ${str}`);
        }
    });
    fs.writeSync(csv, stringify([row]));
    fs.writeSync(json,      '}}\n');
    fs.writeSync(mlsem,     '</triples>\n');
    fs.writeSync(xml,       '</' + root + '>\n');
    fs.writeSync(singlettl, '\n');
}

const sections = [
    [ 'films',     'film',     ['characters', 'planets', 'starships', 'vehicles', 'species'] ],
    [ 'people',    'people',   ['films', 'species', 'vehicles', 'starships'] ],
    [ 'planets',   'planet',   ['residents', 'films'] ],
    [ 'species',   'species',  ['people', 'films'] ],
    [ 'starships', 'starship', ['pilots', 'films'] ],
    [ 'vehicles',  'vehicle',  ['pilots', 'films'] ],
];

const singlettl = fs.openSync(SINGLETTL, 'w');
fs.writeSync(singlettl, '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n');
fs.writeSync(singlettl, '@prefix sw:   <http://h2o.consulting/ns/star-wars#> .\n');
fs.writeSync(singlettl, '@prefix xs:   <http://www.w3.org/2001/XMLSchema#> .\n\n');

sections.forEach(section => {
    const dir  = section[0];
    const root = section[1];
    const rels = section[2];
    const data = DATA[dir];
    console.warn('** ' + yellow(dir));
    // prepare the CSV file
    const csv = fs.openSync(CSVDIR + dir + '/' + dir + '.csv', 'w');
    fs.writeSync(csv, stringify([Object.keys(data[0]).filter(k => ! rels.includes(k))]));
    // write all entities of this section, all formats
    data.forEach(entity => writeEntity(entity, dir, root, singlettl, csv, rels));
    // write the CSV files for associations
    for ( const rel of rels ) {
        const csv = fs.openSync(CSVDIR + dir + '/' + dir + '-' + rel + '.csv', 'w');
        fs.writeSync(csv, stringify([[root, rel]]));
        data.forEach(entity => {
            entity[rel].forEach(val => fs.writeSync(csv, stringify([[entity.url, val]])));
        });
    }
    console.warn();
});
