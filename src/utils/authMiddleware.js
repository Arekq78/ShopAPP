require('dotenv').config()
const jwt = require('jsonwebtoken')
const { StatusCodes } = require('http-status-codes');
const problem = require("./problem");

const auth = (requiredRole = null) => {
  return (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(StatusCodes.UNAUTHORIZED).json(problem.createProblem({
        type: "https://example.com/bledy/brak-dostepu",
        title: "Brak autoryzacji",
        status: StatusCodes.UNAUTHORIZED,
        details: "Brak tokenu uwierzytelniającego.",
        instance: req.originalUrl
      }));
    }

    jwt.verify(token, process.env.JWT_ACCESS_SECRET, (err, user) => {
      if (err) {
          return res.status(StatusCodes.FORBIDDEN).json(problem.createProblem({
            type: "https://example.com/bledy/dostep-zabroniony",
            title: "Dostęp zabroniony",
            status: StatusCodes.FORBIDDEN,
            details: "Token jest nieprawidłowy lub wygasł.",
            instance: req.originalUrl
          }));
      }

      if (requiredRole && user.role !== requiredRole) {
          return res.status(StatusCodes.FORBIDDEN).json(problem.createProblem({
            type: "https://example.com/bledy/brak-uprawnien",
            title: "Brak wystarczających uprawnień",
            status: StatusCodes.FORBIDDEN,
            details: `Wymagana rola: ${requiredRole}. Twoja rola: ${user.role}.`,
            instance: req.originalUrl,
            required_Role: requiredRole,
            user_Role: user.role
          }));
      }

      req.user = user;
      next();
    });
  };
};

module.exports = auth;
