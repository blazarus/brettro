# Brettro

A simple application to help teams do retrospectives. It is inspired by [funretro](http://funretro.github.io/distributed/) and is meant to be a way for me to learn Angular, TypeScript, and graphql.

While there is a server, at this point it only stores data in memory and is not persisten.

The project uses a variety of graphql tools from the [apollo](https://github.com/apollographql) project.

## Installation

Make sure you have [nodejs](https://nodejs.org) and [yarn](https://yarnpkg.com/) installed, and then run
```
yarn
```
from the root of the repository to install required packages.

## Development

Start by generating TypeScript types from the graphql schema:
```
yarn run codegen
```
Then start the graphql server:
```
yarn run server
```
And finally start the dev server for the front end:
```
yarn start
```
The app will be available at `http://localhost:4200/`. The app will automatically reload if you change any of the source files.
