require('dotenv').config()
const jwt = require('jsonwebtoken')
const { StatusCodes } = require('http-status-codes');
const problem = require("./problem");

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(StatusCodes.UNAUTHORIZED).json(problem.createProblem({
        type: "https://example.com/bledy/brak-dostepu",
        tytul: "Brak autoryzacji",
        status: StatusCodes.UNAUTHORIZED,
        szczegoly: "Brak tokenu uwierzytelniającego w nagłówku Authorization.",
        instancja: req.originalUrl
    }));
  }

  jwt.verify(token, process.env.JWT_ACCESS_SECRET, (err, user) => {
    if (err) {
      return res.status(StatusCodes.FORBIDDEN).json(problem.createProblem({
        type: "https://example.com/bledy/dostep-zabroniony",
        tytul: "Dostęp zabroniony",
        status: StatusCodes.FORBIDDEN,
        szczegoly: "Token jest nieprawidłowy lub wygasł.",
        instancja: req.originalUrl
      }));
    }

    req.user = user; 
    next();
  });
};

module.exports = authenticateToken;
