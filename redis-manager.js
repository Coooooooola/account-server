const serverConfig = require('../server-config.json')
const redis = require('redis')

const SIGNUP = 1
const SIGNIN = 2
const ONLINE = 3

function handleError(err) {
    mailer.notifyAdmin(err)
    throw err
}

const client = redis.createClient(serverConfig.redisOptions)

module.exports = {
    quit: () => client.quit(),
    signupEmail: ({ email, username, passwd }, sessionid) => {
        client.select(SIGNUP)
        client.setex(email, 1800, JSON.stringify({ username, passwd, sessionid }))
    },
    delSignupEmail: email => {
        client.select(SIGNUP)
        client.del(email)
    },
    validateEmail: function (email, ssid) {
        client.select(SIGNUP)
        return new Promise((res, rej) => {
            client.get(email, (err, result) => {
                if (err) {
                    return handleError(err)
                }
                if (result) {
                    const { username, passwd, sessionid } = JSON.parse(result)
                    if (ssid === sessionid) {
                        this.delSignupEmail(email)
                        // client.del(email)
                        res({ email, username, passwd })
                    } else {
                        rej()
                    }
                } else {
                    rej()
                }
            })
        })
    },
}

