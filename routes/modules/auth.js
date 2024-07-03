const directusRequest = require("../modules/directusRequest");

async function auth(token) {
  const verToken = await directusRequest("/items/Users_Api?filter[token][_eq]=" + token + "", "", "GET");
  if (verToken && verToken.length > 0) {
    return true
  } else {
    return false
  }

}

module.exports = auth