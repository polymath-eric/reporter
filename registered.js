const axios = require('axios');
const fs = require('fs');
const path = require('path');

const GRAPHQL_HOST = "http://dev.server:3045/";
const OUT_FILE = path.join('/tmp', 'registered.csv');

const query = {
    query: `query {
        events(
            orderBy: CREATED_AT_ASC
            filter: {
                moduleId: { equalTo: asset }
                eventId: { equalTo: TickerRegistered }
            }
        ) {
            totalCount
            nodes {
                eventId
                moduleId
                blockId
                block {
                    datetime
                }
                creatorDid: eventArg0
                ticker: eventArg1
                expiry: eventArg2
            }
        }
    }`
};

axios.post(GRAPHQL_HOST, query, {
    headers: {
        'Accept-Encoding': 'gzip, deflate, br',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Connection': 'keep-alive',
        'DNT': '1',
        'Origin': 'http://dev.server:3045'
    }
})
.then(response => {
    const events = response.data.data.events.nodes;
    const csvLines = events.map(event =>  {
        const expiry =  new Date(Number(event.expiry))
const yyyy = expiry.getFullYear();
let mm = expiry.getMonth() + 1; // month is zero-based
let dd = expiry.getDate();

if (dd < 10) dd = '0' + dd;
if (mm < 10) mm = '0' + mm;
const formatted = dd + '/' + mm + '/' + yyyy;

        return`${event.blockId},${event.block.datetime},${event.creatorDid},${event.ticker},${formatted}`
       }
    );
    const csvContent = "blockId,datetime,creatorDid,ticker,expiry\n" + csvLines.join('\n');
    fs.writeFileSync(OUT_FILE, csvContent);
})
.catch(error => {
    console.error('Error fetching data:', error);
});

