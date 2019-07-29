const { RichEmbed } = require('discord.js');
const util = {}

/**
 * @returns {string} the code
 */
util.createCode = () => {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  
    for (var i = 0; i < 5; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));
  
    return text;
}

/**
 * @param {string} link
 * @returns {string} the token from the link  
 */
util.getTokenFromLink = link => {
    const splithref = link.split('');
    let queryextpos;
    for (var i = 0; i < splithref.length; i++) {
        const value = splithref[i];
        if (value == '&') {
            queryextpos = i;
        }
    }
    const tokenarray = splithref.slice(queryextpos + 7, splithref.length);
    const token = tokenarray.join('');
    return token;
}

module.exports = util;