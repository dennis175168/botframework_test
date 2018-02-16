var restify = require('restify');
var request = require('request');

var MBF_DIRECT_LINE_ENDPOINT = 'https://directline.botframework.com';
var MBF_DIRECT_LINE_SECRET = 'LTDF1kC4bxM.cwA.oiI.M6dp98UUyG-bgReVg27QmuQ_iOlLdF4GP5sygqInjzM';
var LINE_BOT_CHANNEL_ACCESS_TOKEN = '62bbbb5733f6e35fb9ae69fa86edd415';

// Setup Restify Server
const server = restify.createServer({
    name: 'skweather',
    version: '0.0.1'
});

server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser({
    mapParams: false
}));

// Webhook URL
server.get("/", function(req, res, next){

    var replyToken = req.body.events[0].replyToken;
    var userId = req.body.events[0].source.userId;
    var lineMessage = req.body.events[0].message.text;

    // Bypass the message to bot fraemwork via Direct Line REST API
    // Ref: https://docs.botframework.com/en-us/restapi/directline3/#navtitle

    // Start a conversation
    request.post(MBF_DIRECT_LINE_ENDPOINT + '/v3/directline/conversations',
        {
            auth: {
                'bearer': MBF_DIRECT_LINE_SECRET
            },
            json: {}
        },
        function (error, response, body) {
            // retrive the conversaion info
            var conversationId = body.conversationId;
            var token = body.token;
            var streamUrl = body.streamUrl;
            
            // send message
            request.post(MBF_DIRECT_LINE_ENDPOINT + '/v3/directline/conversations/' + conversationId + '/activities',
                {
                    auth: {
                        'bearer': token
                    },
                    json: {
                        'type': 'message',
                        'from': {
                            'id': userId
                        },
                        'text': lineMessage
                    }
                },
                function(error, response, sendBody){

                    // receive reply from stream url
                    request.get(streamUrl + '?t=' + token, 
                        {}, 
                        function(error, response, streamBody){
                            // reply to Line user
                            request.post('https://api.line.me/v2/bot/message/reply',
                                {
                                    auth: {
                                        'bearer': LINE_BOT_CHANNEL_ACCESS_TOKEN
                                    },
                                    json: {
                                        replyToken: replyToken,
                                        messages: [
                                            {
                                                "type": "text",
                                                "text": streamBody.activities[0].text
                                            }
                                        ]
                                    }
                                },
                                function (error, response, streamResultBody) {
                                    console.log(streamResultBody);
                                });
                         });
                });
        });
    res.send(200);
    return next();
});

server.listen(process.env.port || process.env.PORT || 5000, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
