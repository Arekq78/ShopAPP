const createProblem = ({ type = "about:blank", tytul, szczegoly, status, instancja, ...dodatkowe }) => ({
  type,
  tytul,
  szczegoly,
  status,
  instancja,
  ...dodatkowe
});

module.exports = { createProblem };
