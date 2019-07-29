const express = require('express');
const app = express();
const r = module.exports = require('rethinkdbdash')({ db: 'discordeats' });
const paypal =require('paypal-rest-sdk');
const config = require('./config.json');
const bodyParser = require('body-parser');

paypal.configure({ 'mode': config.paypal.mode, 'client_id': config.paypal.client_id, 'client_secret': config.paypal.client_secret })

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.send('api is online');
});

app.use('/payments', require('./routes/payments.js'));

app.listen(config.server.port, () => {
    console.log(`SERVER | Started on port ${config.server.port}!`);
});