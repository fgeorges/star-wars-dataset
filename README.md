# Star Wars Dataset

Sample dataset for test purposes.

Simply use the files in the directories `json` or `xml`, depending on your
needs.

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

If you want to get the files inserted into a markLogic database, you can look at
the following code and adapt it as you see fit:

```js
'use strict';

declareUpdate();

const base = '/';
const url  = 'https://raw.githubusercontent.com/fgeorges/star-wars-dataset/master/archive/star-wars-dataset.zip';

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
    xdmp.documentInsert(uri, doc);
    ++ res.inserted;
}

res;
```
