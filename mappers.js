/*
* Replace the your_own_masked_email@domain.com & your_original_email@domain.com with your own masked email and original email
* Also change WEBHOOK_URL with real URL provided from Fluent Support
 */
exports.getChannel = (email, forwarder) => {
    const channelMaps = {
        'your_own_masked_email@domain.com': 'WEBHOOK_URL',
        'your_original_email@domain.com': 'WEBHOOK_URL',
    }

    if(channelMaps[email]) {
        return channelMaps[email];
    } else if(channelMaps[forwarder]) {
        return channelMaps[email];
    }
    return false;
}
