# Star Wars Dataset

Sample dataset for test purposes

Its gets data from [SWAPI](http://swapi.co/), the Star Wars API, to get the
initial dataset (using `scrapper.js`).  It then enriches it a bit with
description texts from Wikipedia (using `enrich.js`).  It also splits it up in
individual files, both JSON and XML (using `entities.js`).

    > npm install
    > src/scrapper.js > data/swapi.json
    > src/enrich.js   > data/enriched.json
    > src/entities.js
