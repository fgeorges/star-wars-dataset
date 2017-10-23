#!/usr/bin/env node

"use strict";

// ---------------------------------------------------------------------------
// Transform the enriched data file to several XML files.
// ---------------------------------------------------------------------------

const fs = require('fs');

// the input file with the entities
const JSONDIR = './json/';
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

function elem(file, name, content)
{
    if ( typeof content === 'string' ) {
        content = content.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    }
    fs.writeSync(file, '   <' + name + '>' + content + '</' + name + '>\n');
}

function toxml(entity, dir, root)
{
    const num  = entity.url.split('/').slice(-2)[0];
    const path = dir + '/' + num;
    console.warn(path);
    const json = fs.openSync(JSONDIR + path + '.json', 'w');
    const xml  = fs.openSync(XMLDIR  + path + '.xml',  'w');
    fs.writeSync(json, '{ "' + root + '": {\n');
    fs.writeSync(xml,  '<' + root + '>\n');
    const props = Object.keys(entity);
    props.forEach((prop, i) => {
        const val  = entity[prop];
        const type = typeof val;
        if ( val === 'unknown' || val === 'n/a' || val === null ) {
        }
        else if ( type === 'string' ) {
            string(json, prop, val);
            endProp(json, i, props.length);
            elem(xml, prop, val);
        }
        else if ( type === 'number' ) {
            number(json, prop, val);
            endProp(json, i, props.length);
            elem(xml, prop, val);
        }
        else if ( Array.isArray(val) ) {
            array(json, prop, val);
            endProp(json, i, props.length);
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
    DATA[dir].forEach(entity => toxml(entity, dir, root));
    console.warn();
});
