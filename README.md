
# Conway Game of Life

Deployed here : https://conwayt1.herokuapp.com/

![gif](https://thumbs.gfycat.com/NaughtyPaltryGeese-size_restricted.gif)

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

## Deployment using Heroku

```
heroku login
heroku git:remote -a YOUR_HEROKU_APP_NAME
git push heroku master -f
```

- Using Websockets to sync users with the master server.
- No session stickiness (refreshing the page is reconnecting as a new player).

TODO :
- No tests
