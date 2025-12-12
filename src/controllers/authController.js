const db = require('../../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { StatusCodes } = require('http-status-codes');
const problem = require("../utils/problem");

require('dotenv').config();

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.user_id, role: user.role }, 
    process.env.JWT_ACCESS_SECRET, 
    { expiresIn: process.env.JWT_ACCESS_TIME }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.user_id, role: user.role }, 
    process.env.JWT_REFRESH_SECRET, 
    { expiresIn: process.env.JWT_REFRESH_TIME }
  );
};

const register = async (req, res) => {
  const { username, password, role } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await db('users').insert({
      username,
      password: hashedPassword,
      role: role || 'KLIENT'
    });

    res.status(StatusCodes.CREATED)
    .json({ 
      message: "Użytkownik utworzony", 
      unsername: username,
      role: role || 'KLIENT'
    });

  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(problem.createProblem({
        type: "https://example.com/bledy/blad-rejestracji",
        title: "Błąd rejestracji",
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        details: error.message,
        instance: req.originalUrl
    }));
  }
};

const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await db('users').where({ username }).first();

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(StatusCodes.UNAUTHORIZED).json(problem.createProblem({
            type: "https://example.com/bledy/bledne-dane",
            title: "Błąd logowania",
            status: StatusCodes.UNAUTHORIZED,
            details: "Nieprawidłowy login lub hasło.",
            instance: req.originalUrl
        }));
    }

    // Generowanie tokenów
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Zapisanie Refresh Token do bazki
    await db('refresh_tokens').insert({
        user_id: user.user_id,
        token: refreshToken
    });

    // Zwrócenie tokenów
    res.json({
      accessToken,
      refreshToken
    });

  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(problem.createProblem({
        type: "https://example.com/bledy/blad-serwera",
        title: "Błąd serwera",
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        details: error.message,
        instance: req.originalUrl
    }));
  }
};

const refreshToken = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(StatusCodes.UNAUTHORIZED).json(problem.createProblem({
        type: "https://example.com/bledy/brak-tokena",
        title: "Brak tokena",
        status: StatusCodes.UNAUTHORIZED,
        details: "Nie podano refresh tokena.",
        instance: req.originalUrl
    }));
  }

  try {
    const tokenInDb = await db('refresh_tokens').where({ token }).first();
    
    if (!tokenInDb) {
         return res.status(StatusCodes.FORBIDDEN).json(problem.createProblem({
            type: "https://example.com/bledy/token-uniewazniony",
            title: "Token unieważniony",
            status: StatusCodes.FORBIDDEN,
            details: "Ten token został wylogowany lub nie istnieje.",
            instance: req.originalUrl
        }));
    }

    jwt.verify(token, process.env.JWT_REFRESH_SECRET, (err, userPayload) => {
      if (err) {
        return res.status(StatusCodes.FORBIDDEN).json(problem.createProblem({
            type: "https://example.com/bledy/nieprawidlowy-token",
            title: "Token nieprawidłowy",
            status: StatusCodes.FORBIDDEN,
            details: "Refresh token wygasł lub jest niepoprawny.",
            instance: req.originalUrl
        }));
      }

      const newAccessToken = generateAccessToken({ 
          user_id: userPayload.id, 
          role: userPayload.role 
      });
      
      res.json({ accessToken: newAccessToken });
    });

  } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(problem.createProblem({
        type: "https://example.com/bledy/blad-serwera",
        title: "Błąd serwera",
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        details: error.message,
        instance: req.originalUrl
      }));
  }
};

const logout = async (req, res) => {
    const { token } = req.body;
    
    try {
        await db('refresh_tokens').where({ token }).del();
        res.sendStatus(StatusCodes.NO_CONTENT);
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
};

module.exports = { register, login, refreshToken, logout };