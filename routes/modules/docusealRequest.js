const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config()

var requestData = []

async function docusealRequest(query, data, method) {
     let config = {
        method: method,
        headers: {
          "X-Auth-Token": process.env.DOCUSEAL_API_KEY,
          "content-type": "application/json"
      },
        redirect: 'follow',
        url: process.env.DOCUSEAL_API_URL+query,
        data : data
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

module.exports = docusealRequest;
