import * as express from 'express';
import { graphqlExpress } from 'graphql-server-express';
import {json, urlencoded} from 'body-parser';

import { createServer } from 'http';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { execute } from 'graphql';
// import { subscriptionManager } from './subscriptions';

import schema from './schema';

let PORT = 3010;
if (process.env.PORT) {
  PORT = parseInt(process.env.PORT, 10) + 100;
}

const WS_PORT = process.env.WS_PORT || 3011;

const app = express();

app.use(urlencoded({ extended: true }));
app.use(json());

app.use('/graphql', graphqlExpress((req) => {
  // Get the query, the same way express-graphql does it
  // https://github.com/graphql/express-graphql/blob/3fa6e68582d6d933d37fa9e841da5d2aa39261cd/src/index.js#L257
  const query = req.query.query || req.body.query;
  if (query && query.length > 2000) {
    // None of our app's queries are this long
    // Probably indicates someone trying to send an overly expensive query
    throw new Error('Query too large.');
  }

  return {
    schema,
    context: {},
  };
}));

// app.use('/graphiql', graphiqlExpress({
//   endpointURL: '/graphql',
//   query: `{
//   feed (type: NEW, limit: 5) {
//     repository {
//       owner { login }
//       name
//     }
//     postedBy { login }
//   }
// }
// `,
// }));

app.listen(PORT, () => console.log( // eslint-disable-line no-console
  `API Server is now running on http://localhost:${PORT}`
));

// WebSocket server for subscriptions
const websocketServer = createServer((request, response) => {
  response.writeHead(404);
  response.end();
});

websocketServer.listen(WS_PORT, () => console.log( // eslint-disable-line no-console
  `Websocket Server is now running on http://localhost:${WS_PORT}`
));

SubscriptionServer.create({
    schema,
    execute
}, {
    server: websocketServer,
    path: '/subscriptions',
});
