const createProblem = ({ type = "about:blank", title, details, status, instance, ...extras }) => ({
  type,
  title,
  details,
  status,
  instance,
  ...extras
});

module.exports = { createProblem };
