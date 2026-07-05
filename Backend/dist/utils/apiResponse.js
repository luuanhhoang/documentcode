export const ok = (res, message, data) => {
    res.json({
        success: true,
        message,
        data
    });
};
export const fail = (res, status, message, data = null) => {
    res.status(status).json({
        success: false,
        message,
        data
    });
};
