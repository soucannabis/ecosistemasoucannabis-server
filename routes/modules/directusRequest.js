const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

async function directusRequest(query, data, method) {
  var requestData = [];

  let config = {
    method: method,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization,Access-Control-Allow-Origin,Access-Control-Allow-Headers",
      "Authorization": "Bearer "+process.env.DIRECTUS_API_TOKEN,
    },
    maxBodyLength: Infinity,
    url: process.env.DIRECTUS_API_URL + query,
    data: data,
  };

  try {
    const response = await axios.request(config);
    if (query == "/folders" || query == "/items/Users" || query.includes("/items/Users_Products") || query.includes("/items/Products") ) {
      requestData = response.data.data;
    } else {
      requestData = response.data.data[0];
    }

    return requestData;
  } catch (error) {
    console.log("Erro");
    console.log(error.response.data.errors);
  }
}

module.exports = directusRequest;
