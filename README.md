
# Conway Game of Life

## Launch the server

```
yarn
node server.js
```

## Launch the UI

```
yarn
yarn start_local
```

Using Websockets to sync users with the master server.

TODO :
- No tests
- No proper OOP
- Doesn't scale well right now as we are sending the entire cell matrix to each player at each tick. (see inside the code for a potential solution).# conway
