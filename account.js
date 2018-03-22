const sqlManager = require('./sql-manager')
const redisManager = require('./redis-manager')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const mailer = require('./mailer')

const MAXAGE = 3600 * 24 * 30
const COOKIEPATH = '/'

// const SERECT = crypto.randomBytes(24).toString('hex')
const SERECT = require('../server-config.json').serect
function handleError(err) {
    mailer.notifyAdmin(err)
    throw err
}


const username = { type: 'string', minLength: 2, maxLength: 30, pattern: '^[\\w_]{2,30}$' }
const email = { type: 'string', minLength: 6, maxLength: 30, pattern: '^\\w+@\\w+\.\\w+$' }
const passwd = { type: 'string', minLength: 64, maxLength: 64 }

const isSuccess = { type: 'boolean' }
const isUsable = { type: 'boolean' }
const remember = { type: 'boolean' }
const sessionid = { type: 'string' }

const responseIsUsable = {
    200: {
        type: 'object',
        properties: { isUsable },
        required: ['isUsable']
    }
}
const responseIsSuccess = {
    200: {
        type: 'object',
        properties: { isSuccess },
        required: ['isSuccess']
    }
}






module.exports = function (fastify, opts, next) {

    fastify.register(require('fastify-cookie'))
    // fastify.register(require('fastify-multipart'))
    
    
    
    // check
    fastify.get('/check-username', {
        schema: {
            querystring: {
                type: 'object',
                properties: { username },
                required: ['username']
            }
        },
        response: responseIsUsable
    }, async (request, reply) => {
        try {
            await sqlManager.usableUsername(request.query.username)
        } catch (err) {
            reply.send({ isUsable: false })
        }
        reply.send({ isUsable: true })
    })
    
    fastify.get('/check-email', {
        schema: {
            querystring: {
                type: 'object',
                properties: { email },
                required: ['email']
            }
        },
        response: responseIsUsable
    }, async (request, reply) => {
        try {
            await sqlManager.usableEmail(request.query.email)
        } catch (err) {
            reply.send({ isUsable: false })
        }
        reply.send({ isUsable: true })
    })
    
    
    // signup
    fastify.post('/signup', {
        schema: {
            body: {
                type: 'object',
                properties: { username, email, passwd },
                required: ['email', 'username', 'passwd']
            }
        },
        response: responseIsSuccess
    }, async (request, reply) => {
        const { username, email, passwd } = request.body
        try {
            await sqlManager.usableUser(username, email)
        } catch (err) {
            reply.send({ isSuccess: false })
        }
        const sessionid = crypto.randomBytes(8).toString('hex')
        redisManager.signupEmail(request.body, sessionid)
        try {
            await mailer.activateEmail(username, email, sessionid)
            reply.send({ isSuccess: true })
        } catch (err) {
            // redisManager.delSignupEmail(email)
            reply.send({ isSuccess: false })
        }
    })
    
    
    // activate
    fastify.get('/activate', {
        schema: {
            querystring: {
                type: 'object',
                properties: { email, sessionid },
                required: ['email', 'sessionid']
            }
        },
        response: responseIsSuccess
    }, async (request, reply) => {
        const { email, sessionid } = request.query
        try {
            const user = await redisManager.validateEmail(email, sessionid)
            await sqlManager.signup(user)
        } catch (err) {
            reply.send({ isSuccess: false })
        }
        reply.send({ isSuccess: true })
    })
    
    
    // signin
    fastify.post('/signin-with-username', {
        schema: {
            querystring: {
                type: 'object',
                properties: { remember },
                required: ['remember']
            },
            body: {
                type: 'object',
                properties: { username, passwd },
                required: ['username', 'passwd']
            }
        },
        response: responseIsSuccess
    }, async (request, reply) => {
        try {
            const identifier = await sqlManager.signinWithUsername(request.body)
            const exp = Math.floor(new Date().getTime() / 1000) + MAXAGE
            const token = jwt.sign({ identifier, exp }, SERECT)
            reply.setCookie('UID', token, {
                path: COOKIEPATH,
                httpOnly: true,
                maxAge: MAXAGE
            })
            reply.send({ isSuccess: true })
        } catch (err) {
            reply.send({ isSuccess: false })
        }
    })
    
    fastify.post('/signin-with-email', {
        schema: {
            querystring: {
                type: 'object',
                properties: { remember },
                required: ['remember']
            },
            body: {
                type: 'object',
                properties: { email, passwd },
                required: ['email', 'passwd']
            }
        },
        response: responseIsSuccess
    }, async (request, reply) => {
        try {
            const identifier = await sqlManager.signinWithEmail(request.body)
            const exp = Math.floor(new Date().getTime() / 1000) + MAXAGE
            const token = jwt.sign({ identifier, exp }, SERECT)
            reply.setCookie('UID', token, {
                path: COOKIEPATH,
                httpOnly: true,
                maxAge: MAXAGE
            })
            reply.send({ isSuccess: true })
        } catch (err) {
            reply.send({ isSuccess: false })
        }
    })
    
    
    // signout
    fastify.get('/signout', async (request, reply) => {
        reply.setCookie('UID', '', {
            path: COOKIEPATH,
            httpOnly: true,
            maxAge: 0
        })
        reply.send()
    })

    next()
}    
