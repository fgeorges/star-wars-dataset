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
    $ tar zcf star-wars-dataset/archive/star-wars-dataset.tar.gz star-wars-dataset/{README.md,data,json,mlsem,ttl,xml}
    $ zip -r star-wars-dataset/archive/star-wars-dataset.zip star-wars-dataset/{README.md,data,json,mlsem,ttl,xml}
