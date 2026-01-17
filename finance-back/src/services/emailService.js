const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail', // Или настройки твоего SMTP
    auth: {
        user: process.env.SMTP_USER, // Твой gmail
        pass: process.env.SMTP_PASS  // Пароль приложения (App Password)
    }
});

exports.sendVerificationCode = async (email, code) => {
    const mailOptions = {
        from: '"Finance Empire" <no-reply@finance.app>',
        to: email,
        subject: '🔐 Ваш код подтверждения',
        html: `
            <div style="font-family: sans-serif; padding: 20px;">
                <h2>Подтверждение регистрации</h2>
                <p>Ваш код доступа:</p>
                <h1 style="color: #4338ca; letter-spacing: 5px;">${code}</h1>
                <p>Код действителен 10 минут.</p>
            </div>
        `
    };
    await transporter.sendMail(mailOptions);
};