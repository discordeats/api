const Discord = require('discord.js');
const client = module.exports = new Discord.Client({ disableEveryone: true });
const config = require('./config.json');

client.on('ready', () => {
    console.log(`DISCORD | Ready on ${client.user.tag}!`);
});

client.login(config.discord.token);