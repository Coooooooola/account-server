const serverConig = require('../server-config')

const nodemailer = require('nodemailer')
const fs = require('fs')
const activateHtml = fs.readFileSync('./activate-account.html')

const transport = nodemailer.createTransport(serverConig.transporter)

module.exports = {
    notifyAdmin: err => {},
    activateEmail: (username, email, sessionid) => {
        return transport.sendMail({
            from: 'rabbitoops',
            to: email,
            subject: 'RabbitOops: Activate your account.',
            html: activateHtml + `
                <scirpt>
                    const user = ${JSON.stringify({username, email, sessionid})}
                </script>
            `
        })
    }
}