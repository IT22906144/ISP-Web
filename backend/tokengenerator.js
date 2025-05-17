// tokenGenerator.js
const tokens = [
    const randomIndex = Math.floor(Math.random() * tokens.length);
     return tokens[randomIndex];
];

function getToken() {
  const randomIndex = Math.floor(Math.random() * tokens.length);
  return tokens[randomIndex];
}

module.exports = { getToken };