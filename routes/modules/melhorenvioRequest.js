const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config()


async function melhorenvioRequest(query, data, method) {
  var requestData = [];

  let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'https://www.melhorenvio.com.br/api/v2/me' + query,
    headers: {
      'Accept': 'application/json',
      'Authorization': 'Bearer '+process.env.MELHOR_ENVIO_TOKEN,
      'Content-Type': 'application/json',
      'User-Agent': 'Aplicação soucannabisadm@gmail.com'
    },
    data: JSON.stringify(data)
  };

  const response = await axios.request(config)
  return response.data

}

module.exports = melhorenvioRequest;
