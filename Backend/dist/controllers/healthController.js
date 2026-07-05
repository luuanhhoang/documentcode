export const getHealth = (_req, res) => {
    res.json({
        status: "ok",
        service: "backend",
        uptime: Math.round(process.uptime())
    });
};
