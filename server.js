const fastify = require('fastify')()

// fastify.decorate('serverConfig', require('../server-config.json'))

fastify.register(require('./account'), { prefix: '/account' })

fastify.listen(8080, err => {
    if (err) {
        throw err
    }
})



