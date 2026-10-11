export function auditMutations(auditService, realtime) {
  return (req, res, next) => {
    const sendJson = res.json.bind(res);
    res.json = (body) => {
      if (
        !req.actor ||
        ["GET", "HEAD", "OPTIONS"].includes(req.method) ||
        res.statusCode >= 400
      ) {
        return sendJson(body);
      }

      auditService
        .record(req, body)
        .then(() => {
          realtime.publish({
            resource: req.path.split("/").filter(Boolean)[0] ?? "data",
            method: req.method,
            changedAt: new Date().toISOString(),
          });
          sendJson(body);
        })
        .catch(next);
      return res;
    };
    next();
  };
}
