const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');
const fetch = require('node-fetch');
var clc = require("cli-color");
const readline = require('readline');

require('dotenv').config(); 

const app = express();
const port = process.env.PORT;

const fs = require('fs');
const filePath = process.env.FILEPATH;

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI,
});

app.get('/', (req, res) => {
  const scopes = [
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'streaming',
    'app-remote-control',
    'user-read-email',
    'user-read-private',
    'playlist-read-collaborative',
    'playlist-modify-public',
    'playlist-read-private',
    'playlist-modify-private',
    'user-library-modify',
    'user-library-read',
    'user-top-read',
    'user-read-playback-position',
    'user-read-recently-played',
    'user-follow-read',
    'user-follow-modify'
  ];
  const authorizeURL = spotifyApi.createAuthorizeURL(scopes);
  res.redirect(authorizeURL);
});

app.get('/callback', async (req, res) => {
 try {
    const { code } = req.query;
    const data = await spotifyApi.authorizationCodeGrant(code);
    const { access_token, refresh_token } = data.body;
    console.log("Access_token =", access_token, "\n\nRefresh_token =", refresh_token, "\n\n\n\n");
    spotifyApi.setAccessToken(access_token);
    spotifyApi.setRefreshToken(refresh_token);
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
  var nb = 0;
  for await (var line of rl) {
    nb++;
    try {
      await push(line, access_token, nb);
    } catch (error) {
      console.error(`Erreur lors de l'exécution de la ligne: ${line}`);
      console.error(error);
    }
  }
    res.send('Traitement terminé');
  } catch (error) {
    console.error('Erreur lors de l\'authentification:', error);
    res.status(500).send('Erreur lors de l\'authentification.');
  }
});

app.listen(port, () => {
  console.log(`Serveur en cours d'exécution sur http://localhost:${port}`);
});

async function push(line, access_token, nb) {
      process.stdout.write(clc.blue.bold("GO ", line));
      var searchData = await spotifyApi.searchTracks(line, { limit: 1, offset: 0 });
      var trackUri = searchData.body.tracks.items[0].uri;
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      process.stdout.write(clc.red.bold("SC ", line, "\t", trackUri));
      const apiUrl = `https://api.spotify.com/v1/playlists/${process.env.PLAYLISTID}/tracks?uris=${encodeURIComponent(trackUri)}`;
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'User-Agent': 'your-user-agent',
          },
        });
        const data = await response.json();
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write(clc.green.bold("OK ", nb, line, "\t", trackUri, "\t", data.snapshot_id, "\n"));
      } catch (error) {
        console.error('Erreur lors de la demande d\'ajout de la piste à la playlist:', error);
      }
}

