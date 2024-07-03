const { Signale } = require('signale');

function logger() {
    const options = {
        types: {
            errorMelhorenvio: {
                color: 'red',
                label: 'Erro Melhor Envio'
            },
            melhorenvio: {
                color: 'green',
                label: 'Melhor Envio'
            },
            assist: {
                color: 'green',
                label: 'Extractor'
            },
            leopard: {
                color: 'gray',
                label: 'Laopard'
            },
            directus: {
                color: 'yellow',
                label: 'Directus'
            },
            error: {
                color: 'red',
                label: 'Erro'
            },
            info: {
                color: 'blue',
                label: 'Info'
            }
        }
    };
    return new Signale(options);
}

module.exports = logger;