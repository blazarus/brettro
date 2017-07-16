import * as express from 'express';
import { graphqlExpress } from 'graphql-server-express';
import {json, urlencoded} from 'body-parser';

import { createServer } from 'http';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { execute, subscribe } from 'graphql';

import schema from './schema';

let PORT = 3010;
if (process.env.PORT) {
    PORT = parseInt(process.env.PORT, 10) + 100;
}

const app = express();

app.use(urlencoded({ extended: true }));
app.use(json());

app.use('/graphql', json(), graphqlExpress((req) => {
    return {
        schema,
        context: {}
    };
}));

// WebSocket server for subscriptions
const websocketServer = createServer((request, response) => {
    response.writeHead(404);
    response.end();
});

const server = createServer(app);
    server.listen(PORT, () => {
        new SubscriptionServer(
            {execute, subscribe, schema},
            {server, path: '/subscriptions'},
        );
        console.log(`Brettro GraphQL server running on port ${PORT}.`)
    });
