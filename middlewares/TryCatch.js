

// 🔁 Async wrapper for route handlers to catch and handle errors
const TryCatch = (handler) => {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (err) {
      res.status(500).json({
        message: err.message || "Something went wrong on the server.",
      });
    }
  };
};

export default TryCatch;
