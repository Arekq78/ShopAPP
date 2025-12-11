const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { StatusCodes } = require('http-status-codes');
const problem = require("../utils/problem");

require('dotenv').config();

// Generowanie Access Tokena
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.user_id, role: user.role }, 
    process.env.JWT_ACCESS_SECRET, 
    { expiresIn: process.env.JWT_ACCESS_TIME }
  );
};

// Generowanie Refresh Tokena
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.user_id, role: user.role }, 
    process.env.JWT_REFRESH_SECRET, 
    { expiresIn: process.env.JWT_REFRESH_TIME }
  );
};

// Rejestracja
const register = async (req, res) => {
  const { username, password, role } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await db('users').insert({
      username,
      password: hashedPassword,
      role: role || 'KLIENT'
    });

    res.status(StatusCodes.CREATED).json({ message: "Użytkownik utworzony" });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(problem.createProblem({
        type: "https://example.com/bledy/blad-rejestracji",
        tytul: "Błąd rejestracji",
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        szczegoly: error.message,
        instancja: req.originalUrl
    }));
  }
};

// Logowanie (zwraca Access Token i Refresh Token)
const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await db('users').where({ username }).first();

    if (!user) {
        return res.status(StatusCodes.UNAUTHORIZED).json(problem.createProblem({
            type: "https://example.com/bledy/bledne-dane",
            tytul: "Błąd logowania",
            status: StatusCodes.UNAUTHORIZED,
            szczegoly: "Nieprawidłowy login lub hasło.",
            instancja: req.originalUrl
        }));
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(StatusCodes.UNAUTHORIZED).json(problem.createProblem({
            type: "https://example.com/bledy/bledne-dane",
            tytul: "Błąd logowania",
            status: StatusCodes.UNAUTHORIZED,
            szczegoly: "Nieprawidłowy login lub hasło.",
            instancja: req.originalUrl
        }));
    }

    // Generowanie tokenów
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Zwrócenie tokenów
    res.json({
      accessToken,
      refreshToken
    });

  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(problem.createProblem({
        type: "https://example.com/bledy/blad-serwera",
        tytul: "Błąd serwera",
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        szczegoly: error.message,
        instancja: req.originalUrl
    }));
  }
};

// Odświeżanie tokena
const refreshToken = (req, res) => {
  const { token } = req.body; // { "token": "refresh_token" }

  if (!token) {
    return res.status(StatusCodes.UNAUTHORIZED).json(problem.createProblem({
        type: "https://example.com/bledy/brak-tokena",
        tytul: "Brak tokena",
        status: StatusCodes.UNAUTHORIZED,
        szczegoly: "Nie podano refresh tokena.",
        instancja: req.originalUrl
    }));
  }

  jwt.verify(token, process.env.JWT_REFRESH_SECRET, (err, user) => {
    if (err) {
        return res.status(StatusCodes.FORBIDDEN).json(problem.createProblem({
            type: "https://example.com/bledy/nieprawidlowy-token",
            tytul: "Token nieprawidłowy lub wygasł",
            status: StatusCodes.FORBIDDEN,
            szczegoly: "Refresh token jest nieważny.",
            instancja: req.originalUrl
        }));
    }
    const newAccessToken = generateAccessToken({ user_id: user.id, role: user.role });

    res.json({ accessToken: newAccessToken });
  });
};

module.exports = { register, login, refreshToken };