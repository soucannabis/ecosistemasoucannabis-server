const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config()

var requestData = []

async function pagarmeRequest(query, data, method) {
  
  let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'https://api.pagar.me/core/v5/orders',
    headers: { 
      'Content-Type': 'application/json', 
      'Authorization': 'Basic '+ process.env.PAGARME_TOKEN, 
      'Cookie': '__cf_bm=Ae6q4CcQvfsg9SzBS23CjBorOTAqPAoJRGQwFCutQdY-1712351591-1.0.1.1-URzWAkNe3NRs6DlL.DlXQPSVkWKTLGBJrdXDa4tulHB_4nLncBLpYnRP90Vj.wUvrtH6_tguCVtHtmK0hoNBHA; _cfuvid=cYfPRfzcfkS6B5zZSnBleCUhgWhT6JQdbkz56Z7Zh_E-1712345373104-0.0.1.1-604800000; AWSALBTG=2cjMPKQkSs7MlUZK9maFwdksomj8rWrBHTcpof2XlOhR2gmsjizXiIVA1B57jcFYDP5ggmeF8Q3P8sab7EWh3nHsk6QAWld0myY7YNPol2NgENdAfX4oYqLGA322YP8lUmVK8LG4YIMzJofFEQd4YlcyPaWx5vI0yAn7IMaOvA6eL04tJp4=; AWSALBTGCORS=2cjMPKQkSs7MlUZK9maFwdksomj8rWrBHTcpof2XlOhR2gmsjizXiIVA1B57jcFYDP5ggmeF8Q3P8sab7EWh3nHsk6QAWld0myY7YNPol2NgENdAfX4oYqLGA322YP8lUmVK8LG4YIMzJofFEQd4YlcyPaWx5vI0yAn7IMaOvA6eL04tJp4='
    },
    data : data
  };
  
  await axios.request(config)
  .then((response) => {
    requestData = JSON.stringify(response.data)
  })
  .catch((error) => {
    console.log(error.response.data);
  });

  return requestData
  
}

module.exports = pagarmeRequest;
