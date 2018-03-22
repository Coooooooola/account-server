const serverConfig = require('../server-config.json')
const crypto = require('crypto')
const { promisify } = require('util')
const mysql = require('mysql')

function handleError(err) {
    mailer.notifyAdmin(err)
    throw err
}

const conn = mysql.createConnection(serverConfig.mysqlConfig)


module.exports = {
    usableUsername: function (username) {
        return new Promise((res, rej) => {
            conn.query('SELECT `username` FROM `users` WHERE ? LIMIT 1', { username }, (err, results) => {
                if (err) {
                    return handleError(err)
                }
                results.length === 0 ? res() : rej()
            })
        })
    },
    usableEmail: function (email) {
        return new Promise((res, rej) => {
            conn.query('SELECT `email` FROM `users` WHERE ? LIMIT 1', { email }, (err, results) => {
                if (err) {
                    return handleError(err)
                }
                results.length === 0 ? res() : rej()
            })
        })
    },
    usableUser: function (username, email) {
        return new Promise((res, rej) => {
            conn.query('SELECT `user_id` FROM `users` WHERE ? OR ? LIMIT 1', [{ email }, { username }], (err, results) => {
                if (err) {
                    return handleError(err)
                }
                results.length === 0 ? res() : rej()
            })
        })
    },
    signup: async function ({ username, email, passwd }) {
        try {
            const salt = (
                await promisify(crypto.randomBytes)(24)
            ).toString('base64')

            const saltedPasswd = (
                await promisify(crypto.pbkdf2)(passwd, salt, 1, 48, 'sha256')
            ).toString('base64')

            return new Promise((res, rej) => {

                // bug, need to write transaction to fix it
                conn.query('SELECT `user_id` FROM `users` WHERE ? OR ? LIMIT 1', [{ email }, { username }], (err, results) => {
                    if (err) {
                        return handleError(err)
                    }
                    const [user] = results
                    if (user === undefined) {
                        conn.query('INSERT INTO `users` SET ?, `update_num` = 1, `signup_date` = NOW()', {
                            email, username, salt, passwd: saltedPasswd
                        }, (err) => {
                            if (err) {
                                return handleError(err)
                            }
                            res()
                        })
                    } else {
                        rej()
                    }
                })
            })
        } catch (err) {
            return handleError(err)
        }
    },
    signinWithUsername: function ({ username, passwd: userPasswd }) {
        return new Promise((res, rej) => {
            conn.query('SELECT `user_id`, `salt`, `passwd`, `update_num` FROM `users` WHERE ? LIMIT 1', { username }, async (err, results) => {
                if (err) {
                    return handleError(err)
                }
                const [user] = results
                if (user) {
                    const { 'user_id': userId, salt, passwd, 'update_num': updateNum } = user
                    try {
                        const saltedPasswd = (
                            await promisify(crypto.pbkdf2)(userPasswd, salt, 1, 48, 'sha256')
                        ).toString('base64')
                        saltedPasswd === passwd ? res({ userId, updateNum }) : rej()
                    } catch (err) {
                        return handleError(err)
                    }
                } else {
                    rej()
                }
            })
        })
    },
    signinWithEmail: function ({ email, passwd: userPasswd }) {
        return new Promise((res, rej) => {
            conn.query('SELECT `user_id`, `salt`, `passwd`, `update_num` FROM `users` WHERE ? LIMIT 1', { email }, async (err, results) => {
                if (err) {
                    return handleError(err)
                }
                const [user] = results
                if (user) {
                    const { userId, salt, passwd, updateNum } = user
                    try {
                        const saltedPasswd = (
                            await promisify(crypto.pbkdf2)(userPasswd, salt, 1, 48, 'sha256')
                        ).toString('base64')
                        saltedPasswd === passwd ? res({ userId, updateNum }) : rej()
                    } catch (err) {
                        return handleError(err)
                    }
                } else {
                    rej()
                }
            })
        })
    }
}


