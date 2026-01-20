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

exports.sendPasswordResetEmail = async (email, resetUrl) => {
    const mailOptions = {
        from: '"Finance Empire" <no-reply@finance.app>',
        to: email,
        subject: '🔑 Сброс пароля',
        html: `
            <div style="font-family: sans-serif; padding: 20px; max-width: 600px;">
                <h2>Восстановление пароля</h2>
                <p>Вы запросили сброс пароля для вашего аккаунта в Finance Empire.</p>
                <p>Нажмите на кнопку ниже, чтобы установить новый пароль:</p>
                <div style="margin: 30px 0;">
                    <a href="${resetUrl}" 
                       style="background-color: #4338ca; color: white; padding: 12px 30px; 
                              text-decoration: none; border-radius: 6px; display: inline-block;">
                        Сбросить пароль
                    </a>
                </div>
                <p style="color: #666;">Или скопируйте эту ссылку в браузер:</p>
                <p style="word-break: break-all; color: #4338ca;">${resetUrl}</p>
                <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;" />
                <p style="color: #999; font-size: 12px;">
                    Ссылка действительна 1 час. Если вы не запрашивали сброс пароля, 
                    просто проигнорируйте это письмо.
                </p>
            </div>
        `
    };
    await transporter.sendMail(mailOptions);
};
