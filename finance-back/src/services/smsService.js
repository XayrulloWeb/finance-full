exports.sendVerificationCode = async (phone, code) => {
    // SMS mock for development: prints code to console.
    console.log(`[SMS] Verification code for ${phone}: ${code}`);
};
