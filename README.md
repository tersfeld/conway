
# Conway Game of Life

Deployed here : https://conwayt1.herokuapp.com/

![gif](https://thumbs.gfycat.com/NaughtyPaltryGeese-size_restricted.gif)


Classical game. 

Written in React for the UI (React Konva for the display library). There is a master server ticking every second and synchronizing the different players through socket.io connections.

There is no session stickiness, if you refresh the page, you will be disconnected and reconnected. A new color will be assigned automatically.

You can click on the grid to create a new cell. If you want to put patterns (blinkers and beacons) at a random position on the grid, you can click on the text "Click here to place some patterns".

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



TODO :
- No tests
