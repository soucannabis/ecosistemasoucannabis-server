const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config()

var requestData = []

async function pagarmeRequest(query, data, method) {

     let config = {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic '+ process.env.PAGARME_TOKEN
      },
        maxBodyLength: Infinity,
        url: process.env.PAGARME_URL_API+query,
        data : JSON.stringify(data)
      };
      
      await axios.request(config)
      .then((response) => {
        requestData = response.data
      })
      .catch((error) => {
        console.log(error);
      });

      return requestData
}

module.exports = pagarmeRequest;
