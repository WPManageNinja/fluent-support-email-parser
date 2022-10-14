'use strict';

const fs = require('fs');
const AWS = require('aws-sdk');
const axios = require('axios');
const EmailReplyParser = require("email-reply-parser");
const TurndownService = require("turndown");
const turndownService = new TurndownService();
const {getChannel} = require("./mappers");
const simpleParser = require('mailparser').simpleParser;
const MailParser = require('mailparser').MailParser;

const s3 = new AWS.S3({
    apiVersion: '2006-03-01',
    region: process.env.AWSREGION,
});

const s3AttachmentBucketName = ''; // This need to unique

function parseEmailTo(data) {
    return data.value[0];
}

function getNow() {
    const date = new Date();
    return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
}

fs.readFile('sample_mimes/sample', async function (err, data) {

    try {
        // console.log('Raw email:' + data.Body);
        const email = await simpleParser(data);

        const to = parseEmailTo(email.to);
        const mimeName = 'sample';

        const webhookUrl = getChannel(to.address, email.headers.get('x-forwarded-to'));

        if (!webhookUrl) {
            console.log('No Webhook URL found for email Mime: ' + mimeName + '; Email Address: ' + to.address);
            return false; // Webhook URL could not be found from your mappers.js file
        }

        const now = getNow();
        let isMarkDown = false;

        if (!email.text && email.html) {

            const head = email.html.match(/<head>.*<\/head>/s);
            if (head) {
                email.html = email.html.replace(head[0], '');
            }

            email.text = turndownService.turndown(email.html);
            isMarkDown = true;
        }

        const emailReplyParser = new EmailReplyParser().read(email.text);
        let visibleText = emailReplyParser.getVisibleText();

        // Handle Forwarded Message
        const matches = visibleText.match(/From:.+?(?=To:)[^>]*>/sg);
        let forwarded = null;
        if (matches) {
            let forwardedParts = visibleText.match(/(?<=From:\s+)(.*?)(?=>)/);
            if (forwardedParts) {
                forwardedParts = forwardedParts[0].split('<');
                forwarded = {
                    name: forwardedParts[0].trim(),
                    address: forwardedParts[1].trim()
                };
            }

            matches.forEach(match => visibleText = visibleText.replace(match, ''));
            visibleText = visibleText.replace(/---------- Forwarded message ---------/g, '');
        }

        const formattedData = {
            date: email.date,
            subject: email.subject,
            body_text: (new MailParser()).textToHtml(visibleText),
            messageId: email.messageId,
            from: email.from,
            to: email.to,
            forwarded,
            attachments: [],
            isMarkDown
        };

        const processPayload = async _ => {
            if(false) { // Attachment will not wok on test payload
                for (let i = 0; i < email.attachments.length; i++) {
                    const attachment = email.attachments[i];
                    const key = attachment.filename.split('.').join('_' + Date.now() + '.');

                    await s3.putObject({
                        Bucket: s3AttachmentBucketName,
                        Key: key,
                        Body: attachment.content
                    }).promise();

                    await s3.getSignedUrlPromise('getObject', {
                        Bucket: s3AttachmentBucketName,
                        Key: key,
                    }).then(url => {
                        formattedData.attachments.push({
                            url,
                            cid: attachment.cid,
                            filename: attachment.filename,
                            contentType: attachment.contentType,
                            contentDisposition: attachment.contentDisposition,
                        });
                    })
                }
            }

            const postedData = JSON.stringify(formattedData);

            await axios.post(webhookUrl, {payload: postedData})
                .then((res) => {
                    if(res.data && res.data.type) {
                        console.log(res.data.type);
                        // this is a success
                    } else {
                        // this maybe an error from remote server
                        console.log('Unexpected Data Received from remote Server')
                        console.log(res.data);
                    }
                })
                .catch((error) => {
                    let log = {
                        type: 'failed',
                        payload: postedData,
                        mime: mimeName,
                        created_at: now,
                        updated_at: now
                    };

                    if (error.response) {
                        log.response_status = error.response.status;
                        log.message = 'Probably plugin deactivated.';
                    } else if (error.request) {
                        log.response_status = 400;
                        log.message = 'Domain not available.';
                    } else {
                        log.response_status = 500;
                        log.message = 'Axios setup error.';
                    }

                    console.log(log);
                })
                .finally(() => {});
        }

        await processPayload();

    } catch (Error) {
        console.log(Error, Error.stack);
        return Error;
    }
});
