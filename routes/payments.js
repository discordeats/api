const { Router } = require('express');
const router = Router();
const paypal = require('paypal-rest-sdk');
const config = require('../config.json');
const r = require('../api.js');
const util = require('../util.js');
const client = require('../bot.js');
const { RichEmbed } = require('discord.js');

router.post('/create', async (req, res) => {
    if (req.headers.authorization != config.key) return res.json({ error: true, type: 'Auth key is not correct!' });
    const cost = req.body.cost;
    const requestor = req.body.requestor;
    const channel = req.body.channel;
    const create_payment_json = {
        "intent": "sale",
        "payer": {
            "payment_method": "paypal"
        },
        "redirect_urls": {
            "return_url": config.paypal.return_url,
            "cancel_url": config.paypal.cancel_url
        },
        "transactions": [{
            "item_list": {
                "items": [{
                    "name": "Order",
                    "sku": "001",
                    "price": cost,
                    "currency": "USD",
                    "quantity": 1
                }]
            },
            "amount": {
                "currency": "USD",
                "total": cost
            },
            "description": "The order that you requested from Discord Eats."
        }]
    };
    paypal.payment.create(create_payment_json, (err, payment) => {
        if (err) throw err;
        payment.links.forEach(async link => {
            if (link.rel == 'approval_url') {
                const id = util.createCode();
                const href = link.href;
                const token = util.getTokenFromLink(href);
                await r.table('orders').insert({ id: id, token: token, link: link.href, cost: cost, requestor: { id: requestor.id, tag: requestor.tag }, status: 'PENDING', channel: channel, review: false }).run();
                res.json({ error: false, id: id });
            }
        });
    });
});

router.get('/cont/:id', async (req, res) => {
    const order = await r.table('orders').get(req.params.id).run();
    if (!order) return res.json({ error: true, type: 'No order could be found under that ID!' });
    if (order.status == 'VERIFIED' || order.status == 'CANCELLED') return res.json({ error: true, type: 'Payment already dealt with' });
    res.redirect(order.link);
});

router.get('/success', async (req, res) => {
    const payerid = req.query.PayerID;
    const paymentid = req.query.paymentId;
    const token = req.query.token;
    if (!payerid || !paymentid || !token) return res.json({ error: true, type: 'Insufficient paypal information' });
    const possorders = await r.table('orders').filter({ token: token }).run();
    const order = possorders[0];
    if (order.status == 'VERIFIED' || order.status == 'CANCELLED') return res.json({ error: true, type: 'Payment already dealt with' });

    const execute_payment_json = {
        "payer_id": payerid,
        "transactions": [{
            "amount": {
                "currency": "USD",
                "total": order.cost
            }
        }]
    }; 

    paypal.payment.execute(paymentid, execute_payment_json, async (err, payment) => {
        if (err) {
            console.log(err.response);
            throw err;
        }
        await r.table('orders').get(order.id).update({ status: 'VERIFIED' }).run();
        const firstname = payment.payer.payer_info.first_name;
        const lastname = payment.payer.payer_info.last_name;
        const email = payment.payer.payer_info.email;
        const street = payment.payer.payer_info.shipping_address.line1;
        const city = payment.payer.payer_info.shipping_address.city;
        const state = payment.payer.payer_info.shipping_address.state;
        const postal = payment.payer.payer_info.shipping_address.postal_code;
        const embed = new RichEmbed()
        .setDescription(`**${order.requestor.tag}** has paid the **$${order.cost}**!`)
        .addField('First Name', firstname)
        .addField('Last Name', lastname)
        .addField('Email', email)
        .addField('Shipping Address', `${street}, ${city}, ${state}, ${postal}`)
        .setFooter(`Please rate your experience with !rate ${order.id}`)
        .setColor('GREEN');
        const channel = client.channels.get(order.channel);
        const member = (await channel.guild.fetchMembers()).members.get(order.requestor.id);
        const customer = channel.guild.roles.find(r => r.name === 'Customer');
        if (member && !member.roles.has(customer.id)) {
            member.addRole(customer);
        }
        channel.send(embed);
        res.send('Paid, proceed to Discord');
    });
});

router.get('/cancel', async (req, res) => {
    const token = req.query.token;
    if (!token) return res.json({ error: true, type: 'Insufficient paypal information' });
    const possorders = await r.table('orders').filter({ token: token }).run();
    const order = possorders[0];
    await r.table('orders').get(order.id).update({ status: 'CANCELLED' }).run();
    const embed = new RichEmbed()
    .setDescription(`**${order.requestor.tag}** has cancelled the order!`)
    .setFooter(`Please rate your experience with !rate ${order.id}`)
    .setColor('RED');
    client.channels.get(order.channel).send(embed);
    res.send('Cancelled, proceed to Discord');
});

module.exports = router;