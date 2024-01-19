# Star Wars Dataset

Sample dataset for test and dev purposes.

Simply use the files in the directories `json` or `xml`, depending on your needs.

If you want to tweek the way data is collected, it is taken from the awesome
[SWAPI](http://swapi.co/), the Star Wars API, to get the initial dataset (using
`scrapper.js`).  It then enriches it a bit with description texts from Wikipedia
(using `enrich.js`).  It also splits it up in individual files, both JSON and
XML (using `entities.js`).

    $ npm install
    $ ./src/scrapper.js > data/swapi.json
    $ ./src/enrich.js   > data/enriched.json
    $ ./src/entities.js

To generate the data archive files:

    $ cd ..
    $ tar zcf star-wars-dataset/archive/star-wars-dataset.tar.gz star-wars-dataset/{README.md,data,csv,json,mlsem,ttl,xml}
    $ zip -r star-wars-dataset/archive/star-wars-dataset.zip star-wars-dataset/{README.md,data,csv,json,mlsem,ttl,xml}

## MarkLogic

If you want to get the files inserted into a markLogic database, you can look at the
following code and adapt it as you see fit:

```js
'use strict';

declareUpdate();

const base  = '/';
const colls = ['/star-wars'];
const url   = 'https://raw.githubusercontent.com/fgeorges/star-wars-dataset/master/archive/star-wars-dataset.zip';

const got = xdmp.httpGet(url);
if ( fn.head(got).code !== 200 ) {
    throw new Error(`Not 200: {fn.head(got).code} - {fn.head(got).message}`);
}

const zip = fn.head(fn.tail(got));
const res = {skipped: 0, inserted: 0};

for ( const entry of xdmp.zipManifest(zip) ) {
    if ( ! entry.uncompressedSize ) {
        // skip directories
        ++ res.skipped;
        continue;
    }
    const uri = base + entry.path;
    const doc = xdmp.zipGet(zip, entry.path);
    xdmp.documentInsert(uri, doc, {collections: colls});
    ++ res.inserted;
}

res;
```

If you cannot issue a HTTP GET from MarkLogic itself (for instance if it has been disabled
by your security team,) you can load the ZIP file in the database first (see below,) then
use this modified query:

```js
'use strict';

declareUpdate();

const base  = '/';
const colls = ['/star-wars'];
const zip   = fn.doc('/archive/star-wars-dataset.zip');
const res   = {skipped: 0, inserted: 0};

for ( const entry of xdmp.zipManifest(zip) ) {
    if ( ! entry.uncompressedSize ) {
        // skip directories
        ++ res.skipped;
        continue;
    }
    const uri = base + entry.path;
    const doc = xdmp.zipGet(zip, entry.path);
    xdmp.documentInsert(uri, doc, {collections: colls});
    ++ res.inserted;
}

res;
```

If you want to insert a bit of volume, you can use the following technique:

- first, insert the ZIP archive in the database
- second, extract its content and inserts it multiple times, each time with a different URI base

With the code below, it will insert data with a disk footprint of around 2GB, for 727,376
documents.  The disk footprint is for the default database settings, you can impact it by
changing indexing database settings, by creating range indexes, and by installing TDE
templates to create triples and views.

Because that code loops over 2 lists of 26 words to build the beginning of the document
URIs, you can end up with a maximum of 676 copies of the dataset.  Adding more words to
the lists, or adding a new list to reate a third level, will help you creating more
copies.

In order to download the ZIP file directly from HTTP, execute the following XQuery:

```xquery
xquery version "1.0-ml";

declare namespace http = "xdmp:http";

let $url := 'https://raw.githubusercontent.com/fgeorges/star-wars-dataset/master/archive/star-wars-dataset.zip'
let $uri := '/archive/star-wars-dataset.zip'
let $res := xdmp:http-get($url)
return
  if ( $res[1]/http:code = 200 ) then (
    xdmp:document-insert($uri, $res[2]),
    'ZIP archive inserted at ' || $uri
  )
  else (
    fn:error((), 'Not 200: ' || $res[1]/http:code || ' - ' || $res[1]/http:message);
  )
```

If issuing a HTTP GET directly from MarkLogic is not an option in your corporate
environment, download it manually and put it on the filesystem of one of the cluster
machines.  Then go to QConsole on that same machine and execute the following query (adapt
`$path` in order to point to the file):

```xquery
xquery version "1.0-ml";

let $path := '/tmp/star-wars-dataset.zip'
let $uri  := '/archive/star-wars-dataset.zip'
return
  xdmp:document-load(
    $path,
    map:map()
      => map:with('uri', $uri)
      => map:with('format', 'binary'))
```

Now that the ZIP archive is in the database, execute the following script to actually
insert documents out of it.  Since this will result in inserting more than 700,000
documents in the database, we are not going to do it in a single one transaction.  We can
control the number of copies of the dataset that are performed in a single run by changing
`config.skip` and `config.max`.

There are 676 combinations of both lists of 26 words.  Given they are sorted,
`config.skip` tells how many of them we ignore at the beginning this time, and
`config.max` tells how many we insert after that.  So if we want to insert them 200 by 200
copies, we run the query 4 times, with the following values:

- `skip=0` and `max=200`, will do copies 1 to 200
- `skip=200` and `max=200`, will do copies 201 to 400
- `skip=400` and `max=200`, will do copies 401 to 600
- `skip=600` and `max=200`, will do copies 601 to 676

```js
'use strict';

declareUpdate();

const config = {
    skip:  350,
    max:   350,
    colls: ['/star-wars'],
};

const adjectives = [
    'artful', 'bionic', 'cosmic', 'disco', 'eoan', 'focal', 'groovy', 'hirsute', 'impish',
    'jammy', 'karmic', 'lucid', 'maverick', 'natty', 'oneiric', 'precise', 'quantal',
    'raring', 'saucy', 'trusty', 'utopic', 'vivid', 'wily', 'xenial', 'yakkety', 'zesty'];

const animals = [
    'aardvark', 'beaver', 'cuttlefish', 'dingo', 'ermine', 'fossa', 'gorilla', 'hippo',
    'indri', 'jellyfish', 'koala', 'lynx', 'meerkat', 'narwhal', 'ocelot', 'pangolin',
    'quetzal', 'ringtail', 'salamander', 'tahr', 'unicorn', 'vervet', 'werewolf', 'xerus',
    'yak', 'zapus'];

function extract(zip, acc, adj, animal)
{
    const key   = `${adj}-${animal}`;
    const base  = `/${adj}/${animal}/`;
    const colls = config.colls.concat([adj, animal]);
    const res   = {base, skipped: 0, inserted: 0};
    if ( acc[key] ) {
        throw new Error(`Key already used: ${key}`);
    }
    for ( const entry of xdmp.zipManifest(zip) ) {
        if ( ! entry.uncompressedSize ) {
            // skip directories
            ++ res.skipped;
            continue;
        }
        const uri = base + entry.path;
        const doc = xdmp.zipGet(zip, entry.path);
        xdmp.documentInsert(uri, doc, {collections: colls});
        ++ res.inserted;
    }
    acc[key] = res;
}

const zip = fn.doc('/archive/star-wars-dataset.zip');
const res = {};
for ( const adj of adjectives ) {
    for ( const animal of animals ) {
        if ( config.skip ) { -- config.skip; continue; }
        if ( Object.keys(res).length >= config.max ) { break; }
        extract(zip, res, adj, animal);
    }
}
[Object.keys(res).length, res];
```

Since trying to insert 10 times more data (or more) manually might prove to be tedious,
here is how to queue tasks on the task server to do so automatically.  It includes an
extra level of 26 combinations, leading to 17,576 copies total (or 19,316,025 documents,)
with a disk footprint of around 50 GB.

```xquery
xquery version "1.0-ml";

declare namespace zip = "xdmp:zip";

declare variable $collections := ('/star-wars');

declare variable $adjectives := (
    'artful', 'bionic', 'cosmic', 'disco', 'eoan', 'focal', 'groovy', 'hirsute', 'impish',
    'jammy', 'karmic', 'lucid', 'maverick', 'natty', 'oneiric', 'precise', 'quantal',
    'raring', 'saucy', 'trusty', 'utopic', 'vivid', 'wily', 'xenial', 'yakkety', 'zesty');

declare variable $animals := (
    'aardvark', 'beaver', 'cuttlefish', 'dingo', 'ermine', 'fossa', 'gorilla', 'hippo',
    'indri', 'jellyfish', 'koala', 'lynx', 'meerkat', 'narwhal', 'ocelot', 'pangolin',
    'quetzal', 'ringtail', 'salamander', 'tahr', 'unicorn', 'vervet', 'werewolf', 'xerus',
    'yak', 'zapus');

declare variable $alphabet := (
    'alfa', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel', 'india',
    'juliett', 'kilo', 'lima', 'mike', 'november', 'oscar', 'papa', 'quebec', 'romeo',
    'sierra', 'tango', 'uniform', 'victor', 'whiskey', 'xray', 'yankee', 'zulu');

declare function local:extract($adj, $animal, $letter)
{
    let $zip   := fn:doc('/archive/star-wars-dataset.zip')
    let $base  := '/' || $adj || '/' || $animal || '/' || $letter || '/'
    let $_     := xdmp:log('Extracting with base: ' || $base)
    let $colls := ($collections, $adj, $animal, $letter)
    for $entry in xdmp:zip-manifest($zip)/zip:part
    where $entry/@uncompressed-size gt 0 (: skip directories :)
    return
        xdmp:document-insert(
            $base || $entry,
            xdmp:zip-get($zip, $entry),
            <options xmlns="xdmp:document-insert">
              <collections> {
                $colls ! <collection>{ . }</collection>
              }
              </collections>
            </options>)
};

for $adj    in $adjectives
for $animal in $animals
for $letter in $alphabet
return
    xdmp:spawn-function(function() {
        local:extract($adj, $animal, $letter)
    })
```
